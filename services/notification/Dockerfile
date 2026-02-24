FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY services ./services

RUN npm install
RUN npm run build:shared
RUN cd services/notification && npm run build

WORKDIR /app/services/notification
CMD ["npm", "start"]
