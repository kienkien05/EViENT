FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./

COPY packages/ ./packages/
COPY services/ ./services/

RUN npm ci

RUN npm run build:shared
RUN cd services/auth && npm run build

EXPOSE 3001

CMD ["node", "services/auth/dist/server.js"]
