# AWS デプロイ手順

Recta2 を AWS の EC2 シングルインスタンスにデプロイする手順。月額$15-20程度の最小構成。

## 構成

```
Route53 (isayama-dev.com)
    ↓  A recta.isayama-dev.com
Elastic IP
    ↓
EC2 t3.small (Ubuntu 24.04)
  ├── Nginx (コンテナ) ← :80 / :443
  ├── Node (React Router SSR)
  ├── Laravel (PHP-FPM)
  ├── PostgreSQL 18
  └── Redis 7
S3 (日次バックアップ) ─ Lifecycle 30日で削除
Let's Encrypt (自動更新)
```

- RDS/ALB/ECS は使わない（コスト削減）
- DB は EC2 内で動かし、日次で S3 に dump
- HTTPS は certbot + 自動更新

## 初回セットアップ（手動、1回だけ）

### 1. Terraform でインフラ構築

```bash
cd terraform
cp example.tfvars terraform.tfvars
# 必要に応じて terraform.tfvars を編集（特に ssh_allowed_cidrs を自分のIPに絞ると安全）
terraform init
terraform plan
terraform apply
```

`apply` 後に以下が出力される：

- `app_url`: https://recta.isayama-dev.com
- `ec2_public_ip`: Elastic IP
- `ssh_command`: SSH コマンド
- `backup_bucket`: S3 バックアップバケット名
- `ssh_private_key_path`: `./terraform/.ssh/recta2.pem`（gitignore 済）

### 2. DNS 伝播を確認

```bash
dig +short recta.isayama-dev.com
# ↑ Elastic IP が返ってくればOK
```

### 3. EC2 に SSH して初期設定

```bash
# 初回起動後は user_data 完走まで1-2分待つ
ssh -i terraform/.ssh/recta2.pem ubuntu@<EC2_PUBLIC_IP>

# リポジトリを clone
sudo git clone https://github.com/<YOUR_GH_USER>/recta2.git /opt/recta2
sudo chown -R ubuntu:ubuntu /opt/recta2
cd /opt/recta2

# .env.prod を作成
cp .env.prod.example .env.prod
# エディタで .env.prod を開いて DB_PASSWORD / GEMINI_API_KEY などを埋める
nano .env.prod

# APP_KEY を生成して .env.prod の APP_KEY= 行に貼る
docker compose -f docker-compose.prod.yml run --rm laravel php artisan key:generate --show

# 初回セットアップ（SSL 証明書取得 + 起動 + migration）
sudo RECTA2_DOMAIN=recta.isayama-dev.com RECTA2_EMAIL=you@example.com \
  bash scripts/deploy/first-setup.sh
```

完了したら https://recta.isayama-dev.com にアクセス。

### 4. 証明書の自動更新を設定

```bash
sudo crontab -e
```

末尾に追加：

```
0 4 * * * cd /opt/recta2 && docker run --rm -v $(docker volume inspect -f '{{ .Mountpoint }}' recta2_certbot-webroot):/var/www/certbot -v /etc/letsencrypt:/etc/letsencrypt certbot/certbot:latest renew --quiet && docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload
```

### 5. GitHub Actions の設定（自動デプロイ）

リポジトリの **Settings → Secrets and variables → Actions** で以下を登録：

| Secret | 値 |
|---|---|
| `EC2_HOST` | Elastic IP（`terraform output ec2_public_ip`） |
| `EC2_SSH_KEY` | `terraform/.ssh/recta2.pem` の中身を全部コピペ |

登録後、main にpushすると自動デプロイが走る。

## 通常のデプロイ

main にpushするだけ。GitHub Actions が SSH で EC2 に入り、`scripts/deploy/deploy.sh` を実行する。

手動でやりたい場合：

```bash
ssh -i terraform/.ssh/recta2.pem ubuntu@<EC2_PUBLIC_IP>
cd /opt/recta2
bash scripts/deploy/deploy.sh
```

## バックアップ / リストア

### 自動バックアップ

毎日 03:15 UTC（12:15 JST）に `scripts/deploy/backup-postgres.sh` が cron で動く。
S3 の `s3://<bucket>/postgres/recta2-YYYYMMDDTHHMMSSZ.sql.gz` に保存、30日経過で自動削除。

### 手動バックアップ

```bash
ssh -i terraform/.ssh/recta2.pem ubuntu@<EC2_PUBLIC_IP>
cd /opt/recta2
bash scripts/deploy/backup-postgres.sh
```

### リストア

```bash
# S3 からダウンロード
aws s3 cp s3://<bucket>/postgres/recta2-20260422T031500Z.sql.gz /tmp/restore.sql.gz

# 解凍して流し込む
gunzip -c /tmp/restore.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U recta2 -d recta2
```

## トラブルシュート

### コンテナが落ちている

```bash
cd /opt/recta2
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 <service>
```

### SSL 証明書が切れた

証明書の自動更新 cron が動いていない可能性。手動更新：

```bash
sudo certbot renew
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### マイグレーションが失敗した

```bash
docker compose -f docker-compose.prod.yml exec laravel php artisan migrate:status
docker compose -f docker-compose.prod.yml exec laravel php artisan migrate --force
```

### インスタンスを作り直したい

```bash
cd terraform
terraform taint aws_instance.app
terraform apply
```

Elastic IP と EBS は残るが、**DB は消える**ので事前に S3 バックアップを確認すること。

## コスト目安（東京リージョン、2026年）

| 項目 | 月額 |
|---|---|
| EC2 t3.small (on-demand) | ~$15 |
| EBS gp3 20GB | ~$2 |
| Elastic IP (使用中) | $0 |
| データ転送 (数GB想定) | ~$1-3 |
| S3 バックアップ (1GB想定) | <$0.5 |
| Route53 Hosted Zone | $0.5 |
| **合計** | **~$19-21** |

トラフィックが月数十GBレベルになるまでこの構成で持つ。
