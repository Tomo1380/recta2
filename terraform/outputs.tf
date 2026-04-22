output "app_url" {
  description = "Public URL of the app"
  value       = "https://${aws_route53_record.app.name}"
}

output "ec2_public_ip" {
  description = "Elastic IP of the app instance"
  value       = aws_eip.app.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS of the app instance"
  value       = aws_instance.app.public_dns
}

output "ssh_command" {
  description = "Command to SSH into the instance"
  value       = "ssh -i ${path.module}/.ssh/${var.project_name}.pem ubuntu@${aws_eip.app.public_ip}"
}

output "backup_bucket" {
  description = "S3 bucket for PostgreSQL backups"
  value       = aws_s3_bucket.backup.id
}

output "ssh_private_key_path" {
  description = "Local path to the generated SSH private key (for GitHub Actions secret)"
  value       = local_sensitive_file.private_key.filename
}
