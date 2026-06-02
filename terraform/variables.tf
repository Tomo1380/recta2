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
  # SSH を全世界に開放しない。運用元の固定 IP (例: ["203.0.113.10/32"]) を
  # tfvars で必ず明示する。空のままだと SSH 用 ingress は作成されない設計。
  description = "CIDR blocks allowed to SSH to the EC2 instance. 本番では運用拠点の固定IPに限定すること (空なら SSH ポートを開けない)。"
  type        = list(string)
  default     = []
}

variable "github_repo" {
  description = "GitHub owner/repo for Actions OIDC (optional, leave empty to use key-based deploy)"
  type        = string
  default     = ""
}
