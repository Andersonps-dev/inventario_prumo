# Build context: raiz do monorepo (necessário pros workspaces do npm resolverem).
FROM node:22-bookworm-slim AS builder
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY apps/web apps/web
RUN npm run build -w apps/web

# SPA estática — sem servidor Node em runtime, só nginx servindo os arquivos
# gerados. Não é exposto direto pra internet: o Nginx do host (já cuidando
# de TLS/domínio pros outros projetos) faz proxy pra este container.
FROM nginx:alpine AS runtime
COPY --from=builder /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
