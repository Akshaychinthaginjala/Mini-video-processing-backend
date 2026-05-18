import json
import boto3
import uuid

s3 = boto3.client("s3")
bucket_name = "akshay-video-upload-bucket-2026"


def lambda_handler(event, context):
    file_name = f"{uuid.uuid4()}.mp4"
    upload_url = s3.generate_presigned_url(
        ClientMethod='put_object',
        Params={'Bucket': bucket_name,
                'Key': file_name,
                'ContentType': 'video/mp4'},
                ExpiresIn=300
    )
    return {
        "statusCode": 200,
        "body": json.dumps({
            "upload_url": upload_url,
            "file_name": file_name
        })
    }