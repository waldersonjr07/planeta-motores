#!/usr/bin/env bash
#
# Restauração a partir de um backup gerado por scripts/backup.sh.
#
#   ./scripts/restaurar.sh --banco backups/banco-2026-08-15-0300.sql.gz
#   ./scripts/restaurar.sh --fotos backups/fotos-2026-08-15-0300.tar.gz
#   ./scripts/restaurar.sh --banco <arquivo> --producao    # sobre o sistema no ar
#
# Sem `--producao`, nada toca no sistema no ar: o banco vai para uma cópia
# descartável e as fotos vão para um diretório temporário. É esse o modo do
# ensaio, e é o padrão de propósito — restauração se executa com a oficina
# parada e a cabeça quente, e o destino errado por omissão seria o pior momento
# possível para descobrir o engano.

set -Eeuo pipefail

RAIZ="${RAIZ:-/home/planeta/planeta-motores}"
COMPOSE=(docker compose -f "$RAIZ/docker-compose.prod.yml")
DESTINO_BANCO="pm_restauracao"
PRODUCAO=0
ARQ_BANCO=""
ARQ_FOTOS=""

uso() {
  sed -n '3,8p' "$0" | sed 's/^# \?//'
  exit 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    --banco)    ARQ_BANCO="${2:?--banco exige um arquivo}"; shift 2 ;;
    --fotos)    ARQ_FOTOS="${2:?--fotos exige um arquivo}"; shift 2 ;;
    --destino)  DESTINO_BANCO="${2:?--destino exige um nome}"; shift 2 ;;
    --producao) PRODUCAO=1; shift ;;
    *) echo "opção desconhecida: $1" >&2; uso ;;
  esac
done

[ -n "$ARQ_BANCO$ARQ_FOTOS" ] || uso

confirmar() {
  echo "$1" >&2
  printf 'Digite RESTAURAR para confirmar: ' >&2
  read -r resposta
  [ "$resposta" = "RESTAURAR" ] || { echo "cancelado." >&2; exit 1; }
}

# --------------------------------------------------------------------- banco
if [ -n "$ARQ_BANCO" ]; then
  [ -f "$ARQ_BANCO" ] || { echo "arquivo não encontrado: $ARQ_BANCO" >&2; exit 1; }
  gzip -t "$ARQ_BANCO" || { echo "arquivo corrompido: $ARQ_BANCO" >&2; exit 1; }

  if [ "$PRODUCAO" = 1 ]; then
    DESTINO_BANCO="pm"
    confirmar "ATENÇÃO: isto APAGA o banco de produção 'pm' e o recria a partir
de $ARQ_BANCO. Tudo gravado depois desse backup será perdido."

    # A aplicação precisa soltar o banco: não se derruba um banco com conexão
    # aberta, e o pool do postgres.js mantém as dele vivas.
    echo "parando a aplicação"
    "${COMPOSE[@]}" stop app
  fi

  echo "recriando o banco '$DESTINO_BANCO'"
  # A colação vai explícita em vez de herdada do template. Neste cluster o
  # template já nasceu ICU pt-BR pelo POSTGRES_INITDB_ARGS do compose, então
  # herdar daria no mesmo — mas escrito assim a restauração continua correta num
  # Postgres que não tenha sido inicializado desse jeito, que é justamente o
  # cenário de "a VPS se perdeu e estou levantando outra máquina".
  "${COMPOSE[@]}" exec -T postgres \
    sh -c 'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1' <<SQL
drop database if exists $DESTINO_BANCO;
create database $DESTINO_BANCO
  template template0
  encoding 'UTF8'
  locale_provider icu
  icu_locale 'pt-BR'
  lc_collate 'C'
  lc_ctype 'C';
SQL

  echo "carregando o dump"
  # ON_ERROR_STOP=1: sem ele o psql segue depois de um erro e termina com
  # sucesso sobre um banco pela metade — restauração que mente.
  gunzip -c "$ARQ_BANCO" \
    | "${COMPOSE[@]}" exec -T postgres \
        sh -c "psql -U \"\$POSTGRES_USER\" -d '$DESTINO_BANCO' -v ON_ERROR_STOP=1 -q"

  echo
  echo "--- conferência: linhas por tabela em '$DESTINO_BANCO' ---"
  "${COMPOSE[@]}" exec -T postgres \
    sh -c "psql -U \"\$POSTGRES_USER\" -d '$DESTINO_BANCO' -t" <<'SQL'
select table_name,
       (xpath('/row/c/text()',
              query_to_xml('select count(*) c from '||quote_ident(table_name),
                           false, true, '')))[1]::text::int as linhas
  from information_schema.tables
 where table_schema = 'public'
 order by table_name;
SQL

  if [ "$PRODUCAO" = 1 ]; then
    echo "subindo a aplicação"
    "${COMPOSE[@]}" start app
  fi
fi

# --------------------------------------------------------------------- fotos
if [ -n "$ARQ_FOTOS" ]; then
  [ -f "$ARQ_FOTOS" ] || { echo "arquivo não encontrado: $ARQ_FOTOS" >&2; exit 1; }
  tar tzf "$ARQ_FOTOS" > /dev/null || { echo "arquivo corrompido: $ARQ_FOTOS" >&2; exit 1; }

  PASTA_ARQ="$(cd "$(dirname "$ARQ_FOTOS")" && pwd)"
  NOME_ARQ="$(basename "$ARQ_FOTOS")"

  if [ "$PRODUCAO" = 1 ]; then
    VOLUME_FOTOS=$(docker volume ls -q | grep -E '(^|_)pm-uploads$' | head -1)
    [ -n "$VOLUME_FOTOS" ] || { echo "volume pm-uploads não encontrado" >&2; exit 1; }

    confirmar "ATENÇÃO: isto escreve por cima das fotos em $VOLUME_FOTOS."

    docker run --rm -v "$VOLUME_FOTOS":/fotos -v "$PASTA_ARQ":/entrada:ro alpine:3 \
      tar xzf "/entrada/$NOME_ARQ" -C /fotos
    # O dono tem de voltar a ser o uid da aplicação (1001), senão ela restaura
    # as fotos e não consegue gravar a próxima.
    docker run --rm -v "$VOLUME_FOTOS":/fotos alpine:3 chown -R 1001:1001 /fotos
    echo "fotos restauradas no volume $VOLUME_FOTOS."
  else
    TEMP_FOTOS="$(mktemp -d)"
    docker run --rm -v "$TEMP_FOTOS":/fotos -v "$PASTA_ARQ":/entrada:ro alpine:3 \
      tar xzf "/entrada/$NOME_ARQ" -C /fotos
    echo "ensaio: extraído em $TEMP_FOTOS"
    echo "arquivos: $(find "$TEMP_FOTOS" -type f | wc -l)"
    echo "(apague depois de conferir: rm -rf $TEMP_FOTOS)"
  fi
fi
