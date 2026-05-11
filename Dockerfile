FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

RUN npm run build 

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY repos.json ./

RUN mkdir -p /app/data
ENV DB_PATH=/app/data/bot-memory.db

CMD ["node", "dist/index.js"]
