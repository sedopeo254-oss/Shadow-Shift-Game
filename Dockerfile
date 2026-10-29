FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY assets ./assets
COPY index.html manifest.webmanifest sw.js ./
COPY tools/build.mjs ./tools/build.mjs
COPY server ./server
RUN node tools/build.mjs && mkdir -p /app/data && chown -R node:node /app
USER node
ENV HOST=0.0.0.0 PORT=4173 DB_PATH=/app/data/community.sqlite
EXPOSE 4173
CMD ["node","server/index.mjs"]
