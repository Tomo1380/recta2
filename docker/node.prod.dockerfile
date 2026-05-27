FROM node:24-alpine AS builder

WORKDIR /app

COPY ./frontend/package*.json ./
RUN npm ci

COPY ./frontend .

ARG VITE_GOOGLE_MAPS_API_KEY=""
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# t3.small (RAM 2GB) で vite の rendering chunks フェーズが OOM Killer に
# 落とされるのを防ぐ。Node の old generation を 1.5GB に cap して GC を
# 頻繁化し、ピーク memory を抑える。
# (2026-05-27 deploy 失敗 → swap 追加 + ここでの cap で再発防止)
ENV NODE_OPTIONS="--max-old-space-size=1536"

RUN npm run build

FROM node:24-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public

ENV NODE_ENV=production

# Render sets PORT automatically; react-router-serve reads it
CMD ["npm", "run", "start"]
