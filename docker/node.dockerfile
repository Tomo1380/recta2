FROM node:24-alpine

WORKDIR /app

COPY ./frontend/package*.json ./

RUN npm install

COPY ./frontend .

EXPOSE 4055

CMD ["npm", "run", "dev"]
