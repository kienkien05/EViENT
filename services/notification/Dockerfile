FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./

COPY packages/ ./packages/
COPY services/ ./services/

RUN npm ci

RUN npm run build:shared
RUN cd services/notification && npm run build

EXPOSE 3004

CMD ["node", "services/notification/dist/server.js"]
