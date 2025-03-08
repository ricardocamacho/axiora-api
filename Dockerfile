FROM node:20.15.1-alpine3.20

WORKDIR /app

COPY package.json /app
COPY package-lock.json /app
RUN npm ci

COPY ./src /app/src
COPY ./app.ts /app/app.ts
COPY ./server.ts /app/server.ts
RUN npm run build

COPY .env.dev /app/.env.dev

ENV NODE_ENV=dev

USER node:node

CMD ["node", "build/server.js"]
