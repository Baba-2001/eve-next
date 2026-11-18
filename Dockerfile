# syntax=docker.io/docker/dockerfile:1

FROM node:24-alpine AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM dependencies AS ui-build

COPY . .
ARG EVE_NEXT_PRODUCTION_ORIGIN=http://agent:2000
ENV EVE_NEXT_PRODUCTION_ORIGIN=$EVE_NEXT_PRODUCTION_ORIGIN
RUN mkdir -p public && npm run build

FROM node:24-alpine AS ui

WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3001

COPY --from=ui-build /app/.next/standalone ./
COPY --from=ui-build /app/.next/static ./.next/static
COPY --from=ui-build /app/public ./public

EXPOSE 3001
CMD ["node", "server.js"]

FROM dependencies AS agent

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=2000

RUN apk add --no-cache docker-cli

COPY . .

EXPOSE 2000
CMD ["sh", "-c", "rm -rf /app/.output && npm run build:eve && exec node .output/server/index.mjs"]
