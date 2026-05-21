FROM node:20-alpine

WORKDIR /app

COPY . /app

RUN mkdir -p /app/reports /app/config

ENV WEB_PORT=8099
ENV SPM_CONFIG=/app/config/spm_targets.web.json
ENV SPM_REPORTS=/app/reports

EXPOSE 8099

CMD ["node", "web/server.mjs"]
