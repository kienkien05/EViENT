FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY frontend ./frontend

RUN npm install
RUN cd frontend && npm install

WORKDIR /app/frontend

EXPOSE 5173

CMD ["npx", "vite", "--host", "0.0.0.0"]
