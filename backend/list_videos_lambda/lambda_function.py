import json
import boto3

dynamodb = boto3.resource('dynamodb')

table = dynamodb.Table('videos')


def lambda_handler(event, context):

    response = table.scan()

    print("DYNAMODB RESPONSE:", response)

    items = response.get('Items', [])

    print("ITEMS:", items)

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps({
            "videos": items
        })
    }