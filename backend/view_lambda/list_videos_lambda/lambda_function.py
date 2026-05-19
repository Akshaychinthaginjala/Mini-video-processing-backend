import json
import boto3

s3 = boto3.client("s3")

bucket_name = "akshay-video-upload-bucket-2026"

def lambda_handler(event, context):

    response = s3.list_objects_v2(Bucket=bucket_name)
    videos = []

    if "Contents" in response:
        for item in response["Contents"]:
            videos.append(item["Key"])



    return {
        "statusCode": 200,
        "body": json.dumps({
            "videos": videos
        })
    }