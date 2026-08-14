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

# A pasta das fotos precisa existir e já pertencer ao usuário da aplicação
# ANTES de o volume ser montado. Volume nomeado cujo ponto de montagem não
# existe na imagem nasce de root, e o processo (uid 1001) não consegue escrever:
# o primeiro envio de foto morreria com EACCES na VPS, sem nenhum teste pegar,
# porque a suíte não roda dentro do contêiner. Existindo aqui, o Docker copia
# dono e permissão daqui para o volume novo.
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
