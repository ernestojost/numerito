# Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w @turnia/api -w @turnia/shared -w @turnia/config --include-workspace-root
COPY packages packages
COPY apps/api apps/api
RUN npm run build -w @turnia/shared && npm run build -w @turnia/api

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev -w @turnia/api -w @turnia/shared && npm cache clean --force
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/dist apps/api/dist
WORKDIR /app/apps/api
USER node
EXPOSE 4000
# Apply pending migrations, then start the server.
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/server.js"]
