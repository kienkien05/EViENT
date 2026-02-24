FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY services ./services

RUN npm install
RUN npm run build:shared
RUN cd services/gateway && npm run build

WORKDIR /app/services/gateway
CMD ["npm", "start"]
