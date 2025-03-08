FROM node:20.15.1-alpine3.20

ARG NODE_ENV=dev

WORKDIR /app

COPY package.json /app
COPY package-lock.json /app
RUN npm ci

COPY ./src /app/src
COPY ./server.ts /app/server.ts
RUN npm run build

COPY .env.${NODE_ENV} /app/.env.${NODE_ENV}

ENV NODE_ENV=${NODE_ENV}

USER node:node

CMD ["node", "build/server.js"]
