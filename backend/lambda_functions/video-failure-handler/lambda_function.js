const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  UpdateCommand
} = require("@aws-sdk/lib-dynamodb");

const dynamoClient = new DynamoDBClient({
  region: "ap-south-1"
});

const dynamodb =
  DynamoDBDocumentClient.from(dynamoClient);

exports.handler = async (event) => {

  console.log(
    "DLQ EVENT:",
    JSON.stringify(event, null, 2)
  );

  try {

    for (const record of event.Records) {

      const sqsMessage =
        JSON.parse(record.body);

      const s3Record =
        sqsMessage.Records[0];

      const videoKey =
        decodeURIComponent(
          s3Record.s3.object.key.replace(/\+/g, " ")
        );

      console.log(
        "FAILED VIDEO:",
        videoKey
      );

      await dynamodb.send(
        new UpdateCommand({
          TableName: "videos",

          Key: {
            video_id: videoKey
          },

          UpdateExpression:
            "SET #status = :status",

          ExpressionAttributeNames: {
            "#status": "status"
          },

          ExpressionAttributeValues: {
            ":status": "FAILED"
          }
        })
      );

      console.log(
        "STATUS UPDATED TO FAILED"
      );
    }

  } catch (error) {

    console.error(
      "FAILURE HANDLER ERROR:",
      error
    );

    throw error;
  }
};