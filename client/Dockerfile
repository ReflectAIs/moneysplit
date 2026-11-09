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

# Build client
COPY client client
RUN npm run build -w client

# ---- Runtime stage (nginx) ----
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/client/dist /usr/share/nginx/html

# Nginx config: SPA fallback + proxy /api to server
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
