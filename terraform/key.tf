# Generate an SSH keypair so there's nothing for the user to click through in the console.
# The private key is written to ./.ssh/recta2.pem (gitignored) for SSH access.
resource "tls_private_key" "ec2" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "ec2" {
  key_name   = "${var.project_name}-ec2"
  public_key = tls_private_key.ec2.public_key_openssh
}

resource "local_sensitive_file" "private_key" {
  content         = tls_private_key.ec2.private_key_pem
  filename        = "${path.module}/.ssh/${var.project_name}.pem"
  file_permission = "0600"
}
