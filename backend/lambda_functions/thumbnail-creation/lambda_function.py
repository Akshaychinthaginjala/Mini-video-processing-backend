import json
import boto3
import urllib.parse

dynamodb = boto3.resource("dynamodb")

table = dynamodb.Table("videos")

def lambda_handler(event, context):

    print("FULL EVENT:")
    print(json.dumps(event))

    # GET FILE NAME FROM S3 EVENT
    record = event['Records'][0]

    raw_file_name = record['s3']['object']['key']

    file_name = urllib.parse.unquote_plus(raw_file_name)

    print("UPLOADED FILE:", file_name)

    # GET ALL ITEMS FROM DYNAMODB
    response = table.scan()

    items = response.get("Items", [])

    for item in items:

        print("DYNAMODB VIDEO:", item.get("video_name"))

        # MATCH FILE NAME
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

            print("UPDATED STATUS SUCCESS")

    return {
        "statusCode": 200,
        "body": json.dumps("Processing Complete")
    }