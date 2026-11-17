FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund && mkdir -p /app/data && chown -R node:node /app
COPY --chown=node:node . .
ENV DESTINO_CONTAINER=1 DESTINO_DATA_DIR=/app/data PORT=3013
USER node
EXPOSE 3013
CMD ["npm", "run", "local"]
