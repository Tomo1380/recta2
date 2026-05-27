#!/bin/bash
# EC2 first-boot initialization. Runs once as root on instance creation.
# Installs Docker + Compose, AWS CLI (for S3 backups), and prepares /opt/${project_name}.
set -euxo pipefail

exec > >(tee /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1

export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get upgrade -y
apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  unzip \
  jq \
  git \
  cron

# --- Docker ---
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker
usermod -aG docker ubuntu

# --- AWS CLI v2 (for S3 backups) ---
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
cd /tmp
unzip -o awscliv2.zip
./aws/install
rm -rf /tmp/aws /tmp/awscliv2.zip

# --- Swap (2 GB) ---
# t3.small は RAM 2GB しかなく、vite build の rendering chunks フェーズで
# OOM Killer が走って sshd / docker まで巻き込み停止する事故があった
# (2026-05-27)。永続 swapfile を作って同じ事故を防ぐ。
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'vm.swappiness = 30' > /etc/sysctl.d/99-swap.conf
  sysctl -p /etc/sysctl.d/99-swap.conf
fi

# --- App directory ---
mkdir -p /opt/${project_name}
chown ubuntu:ubuntu /opt/${project_name}

# --- Environment marker for scripts ---
cat > /etc/profile.d/${project_name}.sh <<EOF
export RECTA2_APP_DIR=/opt/${project_name}
export RECTA2_BACKUP_BUCKET=${backup_bucket}
EOF

# --- Daily PostgreSQL backup cron (script is deployed with the repo) ---
cat > /etc/cron.d/${project_name}-backup <<EOF
# Run daily at 03:15 UTC (12:15 JST)
15 3 * * * ubuntu RECTA2_BACKUP_BUCKET=${backup_bucket} /opt/${project_name}/scripts/deploy/backup-postgres.sh >> /var/log/${project_name}-backup.log 2>&1
EOF
chmod 644 /etc/cron.d/${project_name}-backup
systemctl restart cron

# --- Certbot for Let's Encrypt (via snap, the official recommendation) ---
snap install core
snap refresh core
snap install --classic certbot
ln -sf /snap/bin/certbot /usr/bin/certbot

echo "user_data finished at $(date)"
