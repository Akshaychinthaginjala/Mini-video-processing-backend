import json
import boto3

dynamodb = boto3.resource("dynamodb")

table = dynamodb.Table("videos")

def lambda_handler(event, context):

    print("FULL EVENT:")
    print(json.dumps(event))

    # Get uploaded file details
    record = event['Records'][0]

    file_name = record['s3']['object']['key']

    print("UPLOADED FILE:", file_name)

    # Find matching item in DynamoDB
    response = table.scan()

    items = response.get("Items", [])

    for item in items:

        if item.get("video_name") == file_name:

            table.update_item(
                Key={
                    "video_id": item["video_id"]
                },
                UpdateExpression="SET #s = :val",
                ExpressionAttributeNames={
                    "#s": "status"
                },
                ExpressionAttributeValues={
                    ":val": "PROCESSED"
                }
            )

            print("UPDATED STATUS:", file_name)

    return {
        "statusCode": 200,
        "body": json.dumps("Processing Complete")
    }