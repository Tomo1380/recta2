variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "Project name, used as prefix for resources"
  type        = string
  default     = "recta2"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "ebs_size" {
  description = "Root EBS volume size in GB"
  type        = number
  default     = 20
}

variable "domain_name" {
  description = "Root domain managed in Route53"
  type        = string
  default     = "isayama-dev.com"
}

variable "subdomain" {
  description = "Subdomain for the app (e.g. recta → recta.isayama-dev.com)"
  type        = string
  default     = "recta"
}

variable "ssh_allowed_cidrs" {
  description = "CIDR blocks allowed to SSH to the EC2 instance"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "github_repo" {
  description = "GitHub owner/repo for Actions OIDC (optional, leave empty to use key-based deploy)"
  type        = string
  default     = ""
}
