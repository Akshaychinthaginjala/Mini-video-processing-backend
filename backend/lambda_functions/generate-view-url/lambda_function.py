import json
import boto3

s3 = boto3.client("s3")

bucket_name = "akshay-video-upload-bucket-2026"


def lambda_handler(event, context):
    
    file_name = event["queryStringParameters"]["file_name"]

    view_url = s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={
            "Bucket": bucket_name,
            "Key": file_name
        },
        ExpiresIn=300

    )

    return {
        "statusCode": 200,
        "body": json.dumps({
            "view_url": view_url
        })
    }