# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/

# Install all workspace deps
RUN npm ci

# Build shared package
COPY shared shared
RUN npm run build -w shared

# Build server (compile TS)
COPY server server
RUN npm run build -w server

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy production deps
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev

# Copy built artifacts
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/server/dist server/dist
# Copy compiled migrations/seeds (JS) so knex can run them without a TS loader
COPY --from=build /app/server/dist/db/migrations server/dist/db/migrations
COPY --from=build /app/server/dist/db/seeds server/dist/db/seeds
# Compiled knexfile (JS) so migrations run without a TS loader
COPY --from=build /app/server/dist/db/knexfile.js server/dist/db/knexfile.js

WORKDIR /app/server
EXPOSE 4000
CMD ["node", "dist/index.js"]
