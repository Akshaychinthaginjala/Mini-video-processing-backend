output "video_bucket_name" {
  value = aws_s3_bucket.video_bucket.bucket
}

output "thumbnail_bucket_name" {
  value = aws_s3_bucket.thumbnail_bucket.bucket
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.videos.name
}