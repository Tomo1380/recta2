resource "random_id" "backup_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "backup" {
  bucket        = "${var.project_name}-backup-${random_id.backup_suffix.hex}"
  force_destroy = false
}

resource "aws_s3_bucket_public_access_block" "backup" {
  bucket                  = aws_s3_bucket.backup.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "backup" {
  bucket = aws_s3_bucket.backup.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id

  rule {
    id     = "expire-old-backups"
    status = "Enabled"

    filter {} # apply to whole bucket

    expiration {
      days = 30
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}

# -----------------------------------------------------------------------------
# Media bucket — store photos / article thumbnails / category images / staff
# photos / dress-code / TipTap editor images. Public read so the browser can
# fetch them directly without proxying through Laravel.
# -----------------------------------------------------------------------------
resource "random_id" "media_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "media" {
  bucket        = "${var.project_name}-media-${random_id.media_suffix.hex}"
  force_destroy = false
}

# Block public *ACLs* but allow a bucket *policy* that grants public read.
# (AWS default-deny on new accounts otherwise blocks the policy we attach
#  below even after restrict_public_buckets is false.)
resource "aws_s3_bucket_public_access_block" "media" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = false
  ignore_public_acls      = true
  restrict_public_buckets = false
}

data "aws_iam_policy_document" "media_public_read" {
  statement {
    sid       = "PublicRead"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.media.arn}/*"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
  }
}

resource "aws_s3_bucket_policy" "media" {
  bucket     = aws_s3_bucket.media.id
  policy     = data.aws_iam_policy_document.media_public_read.json
  depends_on = [aws_s3_bucket_public_access_block.media]
}

# Browser uploads go through Laravel (multipart POST), so we don't need
# wide-open CORS for write. Read-only CORS so future direct-fetch use cases
# (e.g. canvas pixel access) don't get blocked.
resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    allowed_headers = ["*"]
    max_age_seconds = 3600
  }
}
