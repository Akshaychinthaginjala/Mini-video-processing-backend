import express from "express"

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { DynamoDBClient } from "@aws-sdk/client-dynamodb"

import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"

const router = express.Router()

// ========================================
// S3 CLIENT
// ========================================
const s3 = new S3Client({

  region: process.env.AWS_REGION,

  credentials: {

    accessKeyId: process.env.AWS_ACCESS_KEY,

    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
})

// ========================================
// DYNAMODB CLIENT
// ========================================
const dynamoClient = new DynamoDBClient({

  region: process.env.AWS_REGION,

  credentials: {

    accessKeyId: process.env.AWS_ACCESS_KEY,

    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
})

const dynamodb = DynamoDBDocumentClient.from(dynamoClient)

// ========================================
// GENERATE PRESIGNED URL
// ========================================
router.get("/generate-upload-url", async (req, res) => {

  try {

    const fileName = req.query.fileName

    const fileType = req.query.fileType

    const key = `videos/${Date.now()}-${fileName}`

    const command = new PutObjectCommand({

      Bucket: process.env.VIDEO_BUCKET,

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

// ========================================
// SAVE VIDEO METADATA
// ========================================
router.post("/save-video", async (req, res) => {

  try {

    const {

      video_name,
      video_key,
      status,
      uploaded_at,

    } = req.body

    const params = {

      TableName: process.env.DYNAMODB_TABLE,

      Item: {

        video_id: Date.now().toString(),

        video_name,

        video_key,

        status,

        uploaded_at,
      },
    }

    await dynamodb.send(new PutCommand(params))

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

export default router