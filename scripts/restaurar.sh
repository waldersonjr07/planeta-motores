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
#
# Com `--producao` o dump também é carregado primeiro num banco à parte. O
# banco de produção só é tocado depois que o dump provou que carrega, e a troca
# é uma renomeação — o `pm` antigo continua no cluster com outro nome até você
# mandar apagar.

set -Eeuo pipefail

RAIZ="${RAIZ:-/home/planeta/planeta-motores}"
COMPOSE=(docker compose -f "$RAIZ/docker-compose.prod.yml")
DESTINO_BANCO="pm_restauracao"
PRODUCAO=0
ARQ_BANCO=""
ARQ_FOTOS=""

uso() {
  sed -n '3,7p' "$0" | sed 's/^# \?//'
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

# `--destino` escolhe onde o ensaio carrega o dump. Em produção o lugar não é
# escolha de quem chama: é sempre o banco de espera, e o `pm` só aparece na
# renomeação do fim. Aceitar os dois juntos permitiria `--destino pm
# --producao`, que é exatamente o passo destrutivo que este desenho remove.
if [ "$PRODUCAO" = 1 ] && [ "$DESTINO_BANCO" != "pm_restauracao" ]; then
  echo "--destino não vale com --producao: em produção o dump vai sempre para" >&2
  echo "pm_restauracao e só depois assume o nome pm." >&2
  exit 1
fi

# ------------------------------------------------------- rede de segurança
#
# Com `set -e`, qualquer erro entre parar e subir a aplicação encerraria o
# script na hora — e o site ficaria fora do ar sem que a mensagem de erro
# dissesse isso. Este trap existe para que a aplicação volte sozinha em
# qualquer saída: erro, Ctrl-C ou kill.
APP_PARADA=0

ao_sair() {
  local status=$?
  if [ "$APP_PARADA" = 1 ]; then
    echo >&2
    echo "!! O script terminou com a aplicação parada. Subindo de volta." >&2
    if "${COMPOSE[@]}" start app; then
      echo "!! Aplicação no ar de novo. O banco 'pm' NÃO foi trocado." >&2
    else
      echo "!! FALHOU ao subir a aplicação. O site está fora do ar. Rode à mão:" >&2
      echo "     docker compose -f $RAIZ/docker-compose.prod.yml start app" >&2
    fi
  fi
  exit $status
}
trap ao_sair EXIT
# Sem estes dois, um Ctrl-C durante a troca mataria o script sem passar pelo
# trap de saída.
trap 'exit 130' INT
trap 'exit 143' TERM

psql_em() { # banco, args...
  local banco="$1"; shift
  "${COMPOSE[@]}" exec -T postgres \
    sh -c "psql -U \"\$POSTGRES_USER\" -d '$banco' $*"
}

confirmar() { # texto, palavra
  echo "$1" >&2
  printf 'Digite %s para confirmar: ' "$2" >&2
  read -r resposta
  [ "$resposta" = "$2" ] || { echo "cancelado." >&2; exit 1; }
}

# --------------------------------------------------------------------- banco
if [ -n "$ARQ_BANCO" ]; then
  [ -f "$ARQ_BANCO" ] || { echo "arquivo não encontrado: $ARQ_BANCO" >&2; exit 1; }
  gzip -t "$ARQ_BANCO" || { echo "arquivo corrompido: $ARQ_BANCO" >&2; exit 1; }

  if [ "$PRODUCAO" = 1 ]; then
    confirmar "ATENÇÃO: isto vai substituir o banco de produção pelo conteúdo de
$ARQ_BANCO. Tudo que foi gravado depois desse backup será perdido, inclusive o
que a oficina digitar daqui até a troca.

O dump será carregado primeiro em '$DESTINO_BANCO', com a aplicação no ar. Você
vai conferir as contagens e confirmar de novo antes de qualquer coisa acontecer
com o banco 'pm'." RESTAURAR
  fi

  echo "recriando o banco '$DESTINO_BANCO'"
  # A colação vai explícita em vez de herdada do template. Neste cluster o
  # template já nasceu ICU pt-BR pelo POSTGRES_INITDB_ARGS do compose, então
  # herdar daria no mesmo — mas escrito assim a restauração continua correta num
  # Postgres que não tenha sido inicializado desse jeito, que é justamente o
  # cenário de "a VPS se perdeu e estou levantando outra máquina".
  #
  # O `pg_terminate_backend` cobre a sobra de um ensaio anterior: um psql
  # esquecido aberto neste banco faria o `drop database` falhar.
  psql_em postgres -v ON_ERROR_STOP=1 <<SQL
select pg_terminate_backend(pid)
  from pg_stat_activity
 where datname = '$DESTINO_BANCO' and pid <> pg_backend_pid();
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
  gunzip -c "$ARQ_BANCO" | psql_em "$DESTINO_BANCO" -v ON_ERROR_STOP=1 -q

  echo
  echo "--- conferência: linhas por tabela em '$DESTINO_BANCO' ---"
  psql_em "$DESTINO_BANCO" -t <<'SQL'
select table_name,
       (xpath('/row/c/text()',
              query_to_xml('select count(*) c from '||quote_ident(table_name),
                           false, true, '')))[1]::text::int as linhas
  from information_schema.tables
 where table_schema = 'public'
 order by table_name;
SQL

  if [ "$PRODUCAO" = 1 ]; then
    # Antes de perguntar qualquer coisa, uma checagem que não depende de quem
    # está lendo a tela às três da manhã: banco sem usuário é banco em que
    # ninguém consegue entrar, e não existe cadastro público para criar um. Um
    # dump que carrega sem erro mas chega aqui vazio não serve para nada.
    USUARIOS="$(psql_em "$DESTINO_BANCO" -tAc "'select count(*) from usuarios'" 2>/dev/null \
                | tr -d '[:space:]' || true)"
    case "$USUARIOS" in
      ''|*[!0-9]*)
        echo >&2
        echo "não consegui contar a tabela 'usuarios' em '$DESTINO_BANCO'." >&2
        echo "O dump carregou incompleto. O banco 'pm' não foi tocado." >&2
        exit 1 ;;
    esac
    if [ "$USUARIOS" -lt 1 ]; then
      echo >&2
      echo "'$DESTINO_BANCO' não tem nenhum usuário: ninguém conseguiria entrar" >&2
      echo "no sistema restaurado. O banco 'pm' não foi tocado." >&2
      exit 1
    fi

    echo
    confirmar "Confira as contagens acima. Se forem as de um sistema saudável,
'$DESTINO_BANCO' passa a se chamar 'pm' e o 'pm' de agora é guardado com outro
nome (nada é apagado). A aplicação fica fora do ar por alguns segundos." TROCAR

    ANTIGO="pm_antigo_$(date '+%Y%m%d_%H%M%S')"

    # A aplicação só para agora. Enquanto o dump carregava — que é o passo
    # demorado e o que costuma falhar — a oficina continuou trabalhando, e a
    # janela em que o site fica fora do ar é a da renomeação.
    echo "parando a aplicação"
    "${COMPOSE[@]}" stop app
    APP_PARADA=1

    echo "trocando os nomes: pm -> $ANTIGO, $DESTINO_BANCO -> pm"
    # Não se renomeia banco com conexão aberta. A aplicação já está parada; o
    # terminate cobre o resto (um psql esquecido, um pool que não morreu junto
    # com o contêiner).
    if ! psql_em postgres -v ON_ERROR_STOP=1 <<SQL
select pg_terminate_backend(pid)
  from pg_stat_activity
 where datname in ('pm', '$DESTINO_BANCO') and pid <> pg_backend_pid();
alter database pm rename to $ANTIGO;
alter database $DESTINO_BANCO rename to pm;
SQL
    then
      echo >&2
      echo "!! A TROCA FALHOU NO MEIO. Confira em qual estado o cluster ficou:" >&2
      echo "     docker compose -f $RAIZ/docker-compose.prod.yml exec -T postgres \\" >&2
      echo "       psql -U pm -d postgres -c '\\l'" >&2
      echo "!! Se existir '$ANTIGO' e não existir 'pm', desfaça com:" >&2
      echo "     alter database $ANTIGO rename to pm;" >&2
      exit 1
    fi

    echo "subindo a aplicação"
    "${COMPOSE[@]}" start app
    APP_PARADA=0

    echo
    echo "Restaurado. O banco anterior continua no cluster como '$ANTIGO'."
    echo "Confira o sistema no navegador antes de apagá-lo. Quando tiver certeza:"
    echo "  docker compose -f $RAIZ/docker-compose.prod.yml exec -T postgres \\"
    echo "    psql -U pm -d postgres -c 'drop database $ANTIGO'"
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

    confirmar "ATENÇÃO: isto escreve por cima das fotos em $VOLUME_FOTOS." RESTAURAR

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
