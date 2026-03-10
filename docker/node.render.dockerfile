FROM node:22-alpine AS builder

WORKDIR /app

COPY ./frontend/package*.json ./
RUN npm ci

COPY ./frontend .

RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev && npm install http-proxy-middleware

COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.mjs ./server.mjs

ENV NODE_ENV=production

CMD ["node", "server.mjs"]
