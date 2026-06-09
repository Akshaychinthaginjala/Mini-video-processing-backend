import json
import boto3
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')

table = dynamodb.Table('videos')


class DecimalEncoder(json.JSONEncoder):

    def default(self, obj):

        if isinstance(obj, Decimal):
            return float(obj)

        return super().default(obj)


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
        "body": json.dumps(
            {
                "videos": items
            },
            cls=DecimalEncoder
        )
    }