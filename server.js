require("dotenv").config()

const express = require("express")
const multer = require("multer")
const cors = require("cors")
const ffmpeg = require("fluent-ffmpeg")
const path = require("path")
const fs = require("fs")

const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand
} = require("@aws-sdk/client-s3")

const {
  getSignedUrl
} = require("@aws-sdk/s3-request-presigner")

const {
  DynamoDBClient
} = require("@aws-sdk/client-dynamodb")

const {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand
} = require("@aws-sdk/lib-dynamodb")

const { v4: uuidv4 } = require("uuid")

const app = express()

// ======================================
// MIDDLEWARE
// ======================================

app.use(cors())

app.use(express.json())

// ======================================
// AWS CONFIG
// ======================================

const s3 = new S3Client({

  region: process.env.AWS_REGION,

  credentials: {

    accessKeyId: process.env.AWS_ACCESS_KEY,

    secretAccessKey: process.env.AWS_SECRET_KEY
  }
})

const dynamoClient = new DynamoDBClient({

  region: process.env.AWS_REGION,

  credentials: {

    accessKeyId: process.env.AWS_ACCESS_KEY,

    secretAccessKey: process.env.AWS_SECRET_KEY
  }
})

const docClient =
  DynamoDBDocumentClient.from(dynamoClient)

// ======================================
// ENV VARIABLES
// ======================================

const VIDEO_BUCKET =
  process.env.VIDEO_BUCKET

const THUMBNAIL_BUCKET =
  process.env.THUMBNAIL_BUCKET

const DYNAMODB_TABLE =
  process.env.DYNAMODB_TABLE

// ======================================
// MULTER STORAGE
// ======================================

const storage = multer.diskStorage({

  destination: function (req, file, cb) {

    cb(null, "uploads/")
  },

  filename: function (req, file, cb) {

    cb(null, Date.now() + "-" + file.originalname)
  }
})

const upload = multer({ storage: storage })

// ======================================
// TEST ROUTE
// ======================================

app.get("/", (req, res) => {

  res.send("Server is running")
})

// ======================================
// PRESIGNED URL API
// ======================================

app.get("/api/generate-upload-url", async (req, res) => {

  try {

    const fileName = req.query.fileName

    const fileType = req.query.fileType

    const key = `videos/${Date.now()}-${fileName}`

    const command = new PutObjectCommand({

      Bucket: VIDEO_BUCKET,

      Key: key,

      ContentType: fileType,
    })

    const uploadUrl = await getSignedUrl(

      s3,
      command,
      { expiresIn: 300 }
    )

    res.json({

      uploadUrl,
      key,
    })

  } catch (error) {

    console.log(error)

    res.status(500).json({

      message: "Failed to generate upload URL",
    })
  }
})

// ======================================
// SAVE VIDEO METADATA
// ======================================

app.post("/api/save-video", async (req, res) => {

  try {

    const {

      video_name,
      video_key,
      status,
      uploaded_at,

    } = req.body

    const params = {

      TableName: DYNAMODB_TABLE,

      Item: {

        video_id: req.body.video_key,

        video_name: req.body.video_name,

        video_key: req.body.video_key,

        video_size: req.body.video_size,

        status: req.body.status,

        uploaded_at: req.body.uploaded_at
      },
    }

    await docClient.send(

      new PutCommand(params)
    )

    res.json({

      message: "Metadata saved successfully",
    })

  } catch (error) {

    console.log(error)

    res.status(500).json({

      message: "Failed to save metadata",
    })
  }
})

// ======================================
// OLD UPLOAD API
// KEEP TEMPORARILY
// ======================================

app.post("/upload", upload.single("video"), (req, res) => {

  console.log("UPLOAD API HIT")

  const videoPath = req.file.path

  const videoFileName = req.file.filename

  const thumbnailFileName =
    `thumb-${Date.now()}.png`

  const thumbnailPath = path.join(
    "thumbnails",
    thumbnailFileName
  )

  ffmpeg(videoPath)

    .screenshots({

      count: 1,

      folder: "thumbnails",

      filename: thumbnailFileName,

      size: "320x240"
    })

    .on("end", async () => {

      try {

        console.log(
          "Thumbnail generated successfully"
        )

        const videoFile =
          fs.readFileSync(videoPath)

        await s3.send(

          new PutObjectCommand({

            Bucket: VIDEO_BUCKET,

            Key: `videos/${videoFileName}`,

            Body: videoFile,

            ContentType: "video/mp4"
          })
        )

        console.log("Video uploaded to S3")

        const thumbnailFile =
          fs.readFileSync(thumbnailPath)

        await s3.send(

          new PutObjectCommand({

            Bucket: THUMBNAIL_BUCKET,

            Key: thumbnailFileName,

            Body: thumbnailFile,

            ContentType: "image/png"
          })
        )

        console.log(
          "Thumbnail uploaded to S3"
        )

        await docClient.send(

          new PutCommand({

            TableName: DYNAMODB_TABLE,

            Item: {

              video_id: uuidv4(),

              video_name: videoFileName,

              status: "PROCESSED"
            }
          })
        )

        console.log(
          "Video metadata saved to DynamoDB"
        )

        fs.unlinkSync(videoPath)

        fs.unlinkSync(thumbnailPath)

        console.log("Local files deleted")

        res.json({

          message: "Upload successful",

          video_url:
            `https://${VIDEO_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${videoFileName}`,

          thumbnail_url:
            `https://${THUMBNAIL_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${thumbnailFileName}`
        })

      } catch (error) {

        console.log(
          "Upload Error:",
          error
        )

        res.status(500).json({

          error: "Upload failed"
        })
      }
    })

    .on("error", (err) => {

      console.log(
        "Thumbnail generation error:",
        err
      )

      res.status(500).json({

        error:
          "Thumbnail generation failed"
      })
    })
})

// ======================================
// DELETE VIDEO
// ======================================

app.delete("/api/delete-video", async (req, res) => {

  try {

    const {
      video_key,
      thumbnail_url
    } = req.body

    // Delete video from S3

    await s3.send(

      new DeleteObjectCommand({

        Bucket: VIDEO_BUCKET,

        Key: video_key
      })
    )

    // Get thumbnail filename

    const thumbnailKey =
      "thumbnails/" + thumbnail_url.split("/").pop()

    console.log("THUMBNAIL URL:", thumbnail_url)
    console.log("THUMBNAIL KEY:", thumbnailKey)  

    // Delete thumbnail from S3

    await s3.send(

      new DeleteObjectCommand({

        Bucket: THUMBNAIL_BUCKET,

        Key: thumbnailKey
      })
    )

    // Delete DynamoDB record

    await docClient.send(

      new DeleteCommand({

        TableName: DYNAMODB_TABLE,

        Key: {

          video_id: video_key
        }
      })
    )

    res.json({

      message: "Video deleted successfully"
    })

  } catch (error) {

    console.log("DELETE ERROR:", error)

    res.status(500).json({

      message: "Delete failed"
    })
  }
})
// ======================================
// START SERVER
// ======================================

const PORT = 5000

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  )
})