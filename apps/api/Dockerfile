# Build context: raiz do monorepo (necessário pros workspaces do npm resolverem).
FROM node:22-bookworm-slim AS builder

# python3/make/g++ — bcrypt tem módulo nativo; sem isso o npm ci falha se
# não houver binário pré-compilado pra essa combinação exata de arch/libc.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY apps/api apps/api
RUN npm run prisma:generate -w apps/api
RUN npm run build -w apps/api

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production

# O engine do Prisma carrega libssl dinamicamente em runtime — a imagem
# -slim não traz isso por padrão, e sem ela o Prisma Client falha ao iniciar.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /repo/apps/api

# node_modules completo (com devDependencies) propositalmente — o comando de
# start roda `prisma migrate deploy` antes do servidor, e o CLI do prisma só
# está em devDependencies. Trade-off aceito: imagem maior, sem passo de
# migração separado pra manter (menos uma coisa pra esquecer no deploy).
COPY --from=builder /repo/node_modules /repo/node_modules
COPY --from=builder /repo/apps/api/dist ./dist
COPY --from=builder /repo/apps/api/prisma ./prisma
COPY apps/api/package.json ./package.json

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma && node dist/src/main"]
