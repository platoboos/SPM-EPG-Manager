FROM node:20-alpine

WORKDIR /app

COPY . /app

ENV WEB_PORT=8100
ENV ACTIVE_WINDOW_MINUTES=180

EXPOSE 8100

CMD ["node", "web/server.mjs"]
