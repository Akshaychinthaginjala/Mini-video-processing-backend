
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const fs = require("fs");
const util = require("util");
const stream = require("stream");

const exec = util.promisify(require("child_process").exec);

// =========================
// CLIENTS
// =========================
const s3 = new S3Client({ region: "ap-south-1" });

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

// =========================
// STREAM HELPERS
// =========================
async function streamToFile(readStream, filePath) {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filePath);
    readStream.pipe(writeStream);

    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });
}

// =========================
// HANDLER
// =========================
exports.handler = async (event) => {
  console.log("EVENT:", JSON.stringify(event));

  try {
    for (const record of event.Records) {

      // =========================
      // PARSE SQS → S3 EVENT
      // =========================
      const sqsMessage = JSON.parse(record.body);
      const s3Record = sqsMessage.Records[0];

      const bucket = s3Record.s3.bucket.name;
      const key = decodeURIComponent(
        s3Record.s3.object.key.replace(/\+/g, " ")
      );

      console.log("PROCESSING:", { bucket, key });

      // =========================
      // UNIQUE FILE PATHS (IMPORTANT FIX)
      // =========================
      const id = Date.now() + "-" + Math.random().toString(36).substring(2);

      const inputPath = `/tmp/input-${id}.mp4`;
      const outputPath = `/tmp/thumb-${id}.png`;

      // =========================
      // DOWNLOAD VIDEO STREAM
      // =========================
      const videoObject = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: key })
      );

      await streamToFile(videoObject.Body, inputPath);
      console.log("VIDEO DOWNLOADED");

      // =========================
      // RUN FFMPEG
      // =========================
      const ffmpegPath = "/opt/bin/ffmpeg";

      const command = `${ffmpegPath} -i "${inputPath}" -ss 00:00:01 -vframes 1 "${outputPath}"`;

      console.log("RUNNING:", command);

      await exec(command, { timeout: 30000 });

      console.log("THUMBNAIL CREATED");

      // =========================
      // READ THUMBNAIL
      // =========================
      const thumbnailBuffer = fs.readFileSync(outputPath);

      // =========================
      // CREATE KEY
      // =========================
      const thumbnailKey = key
        .replace("videos/", "thumbnails/")
        .replace(".mp4", ".png");

      // =========================
      // UPLOAD THUMBNAIL
      // =========================
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.THUMBNAIL_BUCKET,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: "image/png",
        })
      );

      console.log("THUMBNAIL UPLOADED");

      const thumbnailUrl = `https://${process.env.THUMBNAIL_BUCKET}.s3.ap-south-1.amazonaws.com/${thumbnailKey}`;

      // =========================
      // UPDATE DYNAMODB
      // =========================
      await dynamodb.send(
        new UpdateCommand({
          TableName: "videos",
          Key: {
            video_id: key, // ensure this matches your DB schema
          },
          UpdateExpression: "SET thumbnail_url = :t, #s = :s",
          ExpressionAttributeNames: {
            "#s": "status",
          },
          ExpressionAttributeValues: {
            ":t": thumbnailUrl,
            ":s": "PROCESSED",
          },
        })
      );

      console.log("DYNAMODB UPDATED");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "All thumbnails processed" }),
    };

  } catch (error) {
    console.error("LAMBDA ERROR:", error);
    throw error;
  }
};

