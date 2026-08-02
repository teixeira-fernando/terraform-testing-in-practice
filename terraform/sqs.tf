resource "aws_sqs_queue" "review_analysis_dlq" {
  name                      = "${var.queue_name}-dlq"
  message_retention_seconds = var.queue_message_retention_period

  tags = {
    Name        = "${var.queue_name}-dlq"
    Environment = var.aws_endpoint != "" ? "development" : "production"
    ManagedBy   = "Terraform"
  }
}

resource "aws_sqs_queue" "review_analysis_queue" {
  name                       = var.queue_name
  visibility_timeout_seconds = var.queue_visibility_timeout
  message_retention_seconds  = var.queue_message_retention_period

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.review_analysis_dlq.arn
    maxReceiveCount     = var.queue_max_receive_count
  })

  tags = {
    Name        = var.queue_name
    Environment = var.aws_endpoint != "" ? "development" : "production"
    ManagedBy   = "Terraform"
  }
}
