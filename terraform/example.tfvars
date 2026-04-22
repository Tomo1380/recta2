# Copy to terraform.tfvars and customize. terraform.tfvars is gitignored.
aws_region    = "ap-northeast-1"
project_name  = "recta2"
instance_type = "t3.small"
ebs_size      = 20
domain_name   = "isayama-dev.com"
subdomain     = "recta"

# Restrict SSH to your own IP for safety, e.g.:
# ssh_allowed_cidrs = ["203.0.113.42/32"]
ssh_allowed_cidrs = ["0.0.0.0/0"]
