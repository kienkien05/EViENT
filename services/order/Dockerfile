FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./

COPY packages/ ./packages/
COPY services/ ./services/

RUN npm ci

RUN npm run build:shared
RUN cd services/order && npm run build

EXPOSE 3003

CMD ["node", "services/order/dist/server.js"]
