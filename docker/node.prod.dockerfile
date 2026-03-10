FROM node:24-alpine AS builder

WORKDIR /app

COPY ./frontend/package*.json ./
RUN npm ci

COPY ./frontend .
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
