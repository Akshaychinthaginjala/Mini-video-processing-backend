import json
import boto3
import uuid

s3 = boto3.client("s3")

dynamodb = boto3.resource("dynamodb")

table = dynamodb.Table("videos")

bucket_name = "akshay-video-upload-bucket-2026"

def lambda_handler(event, context):

    file_name = f"{uuid.uuid4()}.mp4"

    upload_url = s3.generate_presigned_url(
        ClientMethod='put_object',
        Params={
            'Bucket': bucket_name,
            'Key': file_name
        },
        ExpiresIn=300
    )

    # SAVE VIDEO INFO TO DYNAMODB
    table.put_item(
        Item={
            "video_id": str(uuid.uuid4()),
            "video_name": file_name,
            "status": "UPLOADED"
        }
    )

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps({
            "upload_url": upload_url,
            "file_name": file_name
        })
    }