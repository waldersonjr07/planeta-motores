#!/usr/bin/env bash
#
# Backup diário: banco, fotos e cópia para fora da VPS.
#
# Roda no host, como o usuário `planeta`, chamado pelo cron. Não roda dentro do
# contêiner: precisa falar com o Docker e com o rclone, que moram no host.
#
#   ./scripts/backup.sh
#
# Configurável por variável de ambiente, com padrão para a instalação da VPS.

set -Eeuo pipefail

# `pipefail` acima não é detalhe de estilo. Sem ele, `pg_dump | gzip` reporta o
# status do gzip — que tem sucesso comprimindo um erro — e um banco inacessível
# viraria um arquivo .gz pequeno e válido, todo dia, em silêncio.

RAIZ="${RAIZ:-/home/planeta/planeta-motores}"
DESTINO="${DESTINO:-/home/planeta/backups}"
REMOTO="${REMOTO:-b2:planeta-motores-backup}"
DIAS="${DIAS:-14}"
LOG="${LOG:-$DESTINO/backup.log}"
COMPOSE=(docker compose -f "$RAIZ/docker-compose.prod.yml")

# Tamanho abaixo do qual o dump é considerado suspeito. Um banco vazio de
# verdade não acontece: o schema sozinho passa de 10 kB.
MINIMO_BYTES="${MINIMO_BYTES:-10000}"

mkdir -p "$DESTINO"

registrar() {
  printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG"
}

# Sem isto, uma falha no meio deixaria o log dizendo que começou e nunca que
# terminou — e ninguém saberia em qual passo parou.
on_erro() {
  registrar "FALHOU na linha $1. Backup do dia NÃO foi concluído."
}
trap 'on_erro $LINENO' ERR

CARIMBO="$(date '+%Y-%m-%d-%H%M')"
ARQ_BANCO="$DESTINO/banco-$CARIMBO.sql.gz"
ARQ_FOTOS="$DESTINO/fotos-$CARIMBO.tar.gz"

registrar "=== início do backup $CARIMBO ==="

# ---------------------------------------------------------------- banco de dados
#
# O usuário e o banco saem das variáveis que o próprio contêiner já tem, para
# não repetir nome nem senha aqui — e para o script continuar certo se um dia
# mudarem no compose.
#
# Escreve em `.parcial` e só renomeia no fim. Arquivo com nome definitivo, neste
# diretório, é promessa de backup íntegro; um dump cortado na metade por queda
# de energia não pode herdar esse nome.
registrar "gerando dump do banco"
"${COMPOSE[@]}" exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  | gzip -9 > "$ARQ_BANCO.parcial"

if ! gzip -t "$ARQ_BANCO.parcial"; then
  registrar "dump corrompido (gzip -t reprovou). Abortando."
  rm -f "$ARQ_BANCO.parcial"
  exit 1
fi

BYTES_BANCO=$(stat -c%s "$ARQ_BANCO.parcial")
if [ "$BYTES_BANCO" -lt "$MINIMO_BYTES" ]; then
  registrar "dump com $BYTES_BANCO bytes, abaixo do mínimo de $MINIMO_BYTES. Abortando."
  rm -f "$ARQ_BANCO.parcial"
  exit 1
fi

mv "$ARQ_BANCO.parcial" "$ARQ_BANCO"
registrar "banco: $(basename "$ARQ_BANCO") ($BYTES_BANCO bytes)"

# ----------------------------------------------------------------------- fotos
#
# `pg_dump` não pega arquivo nenhum: as fotos das OS moram no volume
# pm-uploads, e o banco guarda só o caminho relativo delas. Backup sem esta
# parte restaura um sistema que aponta para fotos que não existem mais.
#
# O nome real do volume leva o prefixo do projeto do compose, que é o nome do
# diretório. Resolvido em vez de escrito à mão, para não quebrar se o diretório
# for renomeado.
VOLUME_FOTOS=$(docker volume ls -q | grep -E '(^|_)pm-uploads$' | head -1)
if [ -z "$VOLUME_FOTOS" ]; then
  registrar "volume pm-uploads não encontrado. Abortando."
  exit 1
fi

registrar "arquivando fotos do volume $VOLUME_FOTOS"
docker run --rm \
  -v "$VOLUME_FOTOS":/fotos:ro \
  -v "$DESTINO":/saida \
  alpine:3 \
  tar czf "/saida/$(basename "$ARQ_FOTOS").parcial" -C /fotos .

if ! tar tzf "$ARQ_FOTOS.parcial" > /dev/null 2>&1; then
  registrar "arquivo de fotos corrompido (tar tzf reprovou). Abortando."
  rm -f "$ARQ_FOTOS.parcial"
  exit 1
fi

mv "$ARQ_FOTOS.parcial" "$ARQ_FOTOS"
registrar "fotos: $(basename "$ARQ_FOTOS") ($(stat -c%s "$ARQ_FOTOS") bytes)"

# ------------------------------------------------------------ cópia para fora
#
# Backup guardado no mesmo disco que ele deveria proteger não é backup: um
# disco perdido leva o sistema e o histórico junto. Esta é a parte que protege
# contra perder a VPS inteira.
registrar "enviando para $REMOTO"
rclone copy "$DESTINO" "$REMOTO" \
  --include 'banco-*.sql.gz' \
  --include 'fotos-*.tar.gz' \
  --log-level NOTICE 2>&1 | tee -a "$LOG"

# -------------------------------------------------------------------- retenção
#
# Só depois de o backup do dia ter dado certo. Apagar os antigos antes seria
# trocar catorze cópias boas por nenhuma no dia em que o dump falhasse.
registrar "apagando cópias com mais de $DIAS dias"
find "$DESTINO" -maxdepth 1 -name 'banco-*.sql.gz' -mtime "+$DIAS" -print -delete | tee -a "$LOG"
find "$DESTINO" -maxdepth 1 -name 'fotos-*.tar.gz' -mtime "+$DIAS" -print -delete | tee -a "$LOG"
rclone delete "$REMOTO" --min-age "${DIAS}d" --log-level NOTICE 2>&1 | tee -a "$LOG"

# Marca do último sucesso. É por este arquivo que se confere se o backup está
# mesmo acontecendo — o log cresce e ninguém lê, mas a data desta linha é uma
# olhada só.
date '+%Y-%m-%d %H:%M:%S' > "$DESTINO/ULTIMO-SUCESSO"

registrar "=== backup concluído ==="
