resource "aws_s3_bucket" "video_bucket" {
  bucket = var.upload_bucket_name
}

resource "aws_s3_bucket" "thumbnail_bucket" {
  bucket = var.thumbnail_bucket_name
}

resource "aws_dynamodb_table" "videos" {

  name         = var.dynamodb_table_name
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "video_id"

  attribute {
    name = "video_id"
    type = "S"
  }
}


##sqs

resource "aws_sqs_queue" "video_processing_queue" {

  name = "video-processing-queue"

  visibility_timeout_seconds = 120

  message_retention_seconds = 345600

  max_message_size = 1048576

  receive_wait_time_seconds = 0
}

resource "aws_sqs_queue" "video_processing_dlq" {

  name = "video-processing-dlq"

  visibility_timeout_seconds = 30

  message_retention_seconds = 345600

  max_message_size = 1048576

  receive_wait_time_seconds = 0
}

## lambda functions

resource "aws_lambda_function" "thumbnail_generator" {
  function_name = "video-thumbnail-generator-v2"

  role    = "arn:aws:iam::008714536987:role/service-role/video-thumbnail-generator-v2-role-zcabz75g"
  handler = "lambda_function.handler"
  runtime = "nodejs24.x"

  filename         = "../backend/lambda_functions/video-thumbnail-generator-v2/video-thumbnail-generator-v2.zip"
  source_code_hash = filebase64sha256("../backend/lambda_functions/video-thumbnail-generator-v2/video-thumbnail-generator-v2.zip")

  memory_size = 1024
  timeout     = 60

  layers = [
    "arn:aws:lambda:ap-south-1:008714536987:layer:custom-ffmpeg-layer:1"
  ]

  environment {
    variables = {
      DYNAMODB_TABLE   = "videos"
      THUMBNAIL_BUCKET = "akshay-video-thumbnails-2026"
    }
  }
}




resource "aws_lambda_function" "failure_handler" {
  function_name = "video-failure-handler"

  role        = "arn:aws:iam::008714536987:role/service-role/video-failure-handler-role-9wk0qjg4"
  handler     = "lambda_function.handler"
  runtime     = "nodejs24.x"
  memory_size = 128
  timeout     = 3

  filename         = "../backend/lambda_functions/video-failure-handler/video-failure-handler.zip"
  source_code_hash = filebase64sha256("../backend/lambda_functions/video-failure-handler/video-failure-handler.zip")
}


resource "aws_lambda_function" "generate_upload_url" {
  function_name = "generate-upload-url"

  role    = "arn:aws:iam::008714536987:role/service-role/generate-upload-url-role-i51qycfe"
  handler = "lambda_function.lambda_handler"
  runtime = "python3.13"

  filename = "../backend/lambda_functions/generate-upload-url/generate-upload-url.zip"

  memory_size = 128
  timeout     = 3

  source_code_hash = filebase64sha256(
    "../backend/lambda_functions/generate-upload-url/generate-upload-url.zip"
  )
}

resource "aws_lambda_function" "generate_view_url" {
  function_name = "generate-view-url"

  role    = "arn:aws:iam::008714536987:role/service-role/generate-view-url-role-cikxo3ja"
  handler = "lambda_function.lambda_handler"
  runtime = "python3.13"

  filename = "../backend/lambda_functions/generate-view-url/generate-view-url.zip"

  memory_size = 128
  timeout     = 3

  source_code_hash = filebase64sha256(
    "../backend/lambda_functions/generate-view-url/generate-view-url.zip"
  )
}

resource "aws_lambda_function" "thumbnail_creation" {
  function_name = "thumbnail-creation"

  role    = "arn:aws:iam::008714536987:role/service-role/thumbnail-creation-role-4h0gs7x3"
  handler = "lambda_function.lambda_handler"
  runtime = "python3.13"

  filename = "../backend/lambda_functions/thumbnail-creation/thumbnail-creation.zip"

  memory_size = 128
  timeout     = 3

  source_code_hash = filebase64sha256(
    "../backend/lambda_functions/thumbnail-creation/thumbnail-creation.zip"
  )
}

resource "aws_lambda_function" "list_videos" {
  function_name = "list-videos"

  role    = "arn:aws:iam::008714536987:role/service-role/list-videos-role-0nj1dzvo"
  handler = "lambda_function.lambda_handler"
  runtime = "python3.13"

  filename = "../backend/lambda_functions/list-videos/list-videos.zip"

  memory_size = 128
  timeout     = 3

  source_code_hash = filebase64sha256(
    "../backend/lambda_functions/list-videos/list-videos.zip"
  )
}



resource "aws_lambda_event_source_mapping" "video_processing_trigger" {

  event_source_arn = aws_sqs_queue.video_processing_queue.arn

  function_name = aws_lambda_function.thumbnail_generator.arn

  batch_size = 1

  enabled = true
}



resource "aws_s3_bucket_notification" "video_upload_notification" {

  bucket = aws_s3_bucket.video_bucket.id

  queue {
    queue_arn = aws_sqs_queue.video_processing_queue.arn

    events = [
      "s3:ObjectCreated:*"
    ]

    filter_prefix = "videos/"
    filter_suffix = ".mp4"
  }
}