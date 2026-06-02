# Use default VPC to keep things minimal.
# The default VPC in every region has public subnets with an IGW already attached.
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

# Pick the first default subnet deterministically.
locals {
  subnet_id = sort(data.aws_subnets.default.ids)[0]
}

resource "aws_security_group" "app" {
  name        = "${var.project_name}-app"
  description = "Allow HTTP/HTTPS from the world and SSH from allowed CIDRs"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH は許可 CIDR が指定されたときだけ ingress を作る。
  # var.ssh_allowed_cidrs が空 (デフォルト) なら 22 番ポートは一切開かない。
  dynamic "ingress" {
    for_each = length(var.ssh_allowed_cidrs) > 0 ? [1] : []
    content {
      description = "SSH"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = var.ssh_allowed_cidrs
    }
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-app"
  }
}
