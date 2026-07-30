# Build em múltiplos estágios: a imagem final não carrega o código-fonte nem as
# dependências de desenvolvimento.
FROM node:22-alpine AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS construcao
WORKDIR /app
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS producao
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuário sem privilégio: processo de aplicação não roda como root.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=construcao /app/public ./public
COPY --from=construcao --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=construcao --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migrações e o script de usuário rodam dentro do contêiner.
COPY --from=construcao /app/drizzle ./drizzle
COPY --from=construcao /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=construcao /app/scripts ./scripts
COPY --from=construcao /app/src/db ./src/db
COPY --from=construcao /app/src/modulos/auth ./src/modulos/auth
COPY --from=construcao /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
