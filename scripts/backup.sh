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

# O cron roda com um PATH mínimo, que na prática é `/usr/bin:/bin`. O rclone
# instalado pelo script oficial cai em `/usr/local/bin` e ficaria de fora — e o
# efeito não seria um erro visível, seria este script concluir todo dia que "o
# remoto não está configurado" e pular a cópia externa. Falha silenciosa é
# exatamente o que este backup não pode ter.
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

RAIZ="${RAIZ:-/home/planeta/planeta-motores}"
DESTINO="${DESTINO:-/home/planeta/backups}"
REMOTO="${REMOTO:-b2:planeta-motores-backup}"
DIAS="${DIAS:-14}"
LOG="${LOG:-$DESTINO/backup.log}"
COMPOSE=(docker compose -f "$RAIZ/docker-compose.prod.yml")

# Quanto tempo a cópia mensal fica no remoto. Doze meses, em dias, porque o
# sufixo `M` do rclone é ambíguo à leitura ao lado de `m` de minuto.
DIAS_MENSAL="${DIAS_MENSAL:-365}"

# Piso absoluto, em bytes. Não é uma estimativa do tamanho do banco: existe só
# para pegar dump vazio ou truncado logo no começo. O dump real desta oficina
# comprimido está na casa dos 5 kB hoje, e vai crescer.
PISO_BYTES="${PISO_BYTES:-2000}"

# O limite que de fato protege é relativo: o dump de hoje comparado com o de
# ontem. Um número fixo alto abortaria todo dia num banco novo; um número fixo
# baixo o suficiente para caber no banco de hoje nunca mais dispararia depois
# que ele crescesse. Percentual acompanha o crescimento sozinho.
ENCOLHIMENTO_MAXIMO="${ENCOLHIMENTO_MAXIMO:-50}"

# Só o carimbo do último sucesso mora aqui, separado dos dumps de propósito:
# este diretório é montado no contêiner da aplicação (somente leitura) para o
# painel poder avisar quando o backup para. Montar `$DESTINO` inteiro entregaria
# à aplicação web um diretório cheio de dumps do banco para ler uma data só.
ESTADO="$DESTINO/estado"

mkdir -p "$DESTINO" "$ESTADO" 2>/dev/null || true

# Se o `docker compose up` subir antes de este diretório existir, o Docker cria
# o ponto de montagem sozinho — como root. O efeito seria o backup rodar
# inteiro, demorar o que tem de demorar, e falhar na última linha ao gravar o
# carimbo. Conferir antes de começar é mais barato, e a mensagem diz o que fazer.
for dir in "$DESTINO" "$ESTADO"; do
  if [ ! -w "$dir" ]; then
    echo "sem permissão de escrita em $dir (usuário $(id -un))." >&2
    echo "Se o diretório for do root, o Docker o criou ao subir o compose. Corrija com:" >&2
    echo "  sudo chown -R $(id -un):$(id -gn) $DESTINO" >&2
    exit 1
  fi
done

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

if [ "$BYTES_BANCO" -lt "$PISO_BYTES" ]; then
  registrar "dump com $BYTES_BANCO bytes, abaixo do piso de $PISO_BYTES. Abortando."
  rm -f "$ARQ_BANCO.parcial"
  exit 1
fi

# O anterior sai do nome, não da data de modificação: `banco-2026-08-17-0300`
# ordena cronologicamente por ordem alfabética, e um arquivo trazido de volta do
# remoto chegaria com mtime de hoje e viraria "o mais recente" sem ser.
#
# O `|| true` é obrigatório: sem nenhum backup no diretório o glob não casa, o
# `ls` falha, e com `pipefail` a atribuição derrubaria o script inteiro — logo na
# primeira execução, que é justamente quando não há com o que comparar.
ANTERIOR="$(ls -1 "$DESTINO"/banco-*.sql.gz 2>/dev/null | sort | tail -1 || true)"

if [ -n "$ANTERIOR" ]; then
  BYTES_ANTERIOR=$(stat -c%s "$ANTERIOR")
  LIMITE=$(( BYTES_ANTERIOR * (100 - ENCOLHIMENTO_MAXIMO) / 100 ))
  if [ "$BYTES_BANCO" -lt "$LIMITE" ]; then
    registrar "dump com $BYTES_BANCO bytes contra $BYTES_ANTERIOR de $(basename "$ANTERIOR"): encolheu mais de $ENCOLHIMENTO_MAXIMO%. Abortando."
    registrar "Se o banco encolheu de verdade (limpeza, migração), apague o dump anterior ou rode com ENCOLHIMENTO_MAXIMO=100."
    rm -f "$ARQ_BANCO.parcial"
    exit 1
  fi
  registrar "tamanho conferido contra $(basename "$ANTERIOR") ($BYTES_ANTERIOR bytes)"
else
  registrar "primeiro backup neste diretório: só o piso de $PISO_BYTES bytes foi conferido"
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
#
# Duas pastas no remoto, com prazos diferentes:
#
#   diario/  catorze dias, igual ao disco local. É o backup do dia a dia.
#   mensal/  doze meses. É o que cobre erro descoberto tarde — dado apagado em
#            março e percebido em julho não tem como sair de uma cópia de
#            catorze dias, porque toda cópia dessa janela já nasceu errada.
#
# Se o rclone ou o remoto ainda não existirem, o script avisa e segue. É
# deliberado: o backup local funcionando hoje vale mais do que nenhum backup
# esperando a conta do B2 ficar pronta. O aviso vai para o log e para o
# ULTIMO-SUCESSO, para não virar um esquecimento permanente.
COPIA_EXTERNA=""
NOME_REMOTO="${REMOTO%%:*}"

if ! command -v rclone > /dev/null 2>&1; then
  COPIA_EXTERNA="PULADA (rclone não instalado)"
elif ! rclone listremotes 2>/dev/null | grep -qx "$NOME_REMOTO:"; then
  COPIA_EXTERNA="PULADA (remoto '$NOME_REMOTO:' não configurado no rclone)"
fi

if [ -n "$COPIA_EXTERNA" ]; then
  registrar "AVISO: cópia para fora da VPS $COPIA_EXTERNA."
  registrar "AVISO: enquanto isso o backup existe só no disco desta máquina. Ver docs/backup.md."
else
  registrar "enviando para $REMOTO/diario"
  rclone copy "$DESTINO" "$REMOTO/diario" \
    --include 'banco-*.sql.gz' \
    --include 'fotos-*.tar.gz' \
    --log-level NOTICE 2>&1 | tee -a "$LOG"

  # A cópia mensal nasce do primeiro backup do mês que conseguir subir, não do
  # dia 1º: se a máquina estiver fora do ar naquela madrugada, o mês inteiro
  # ficaria sem cópia longa e ninguém perceberia. A pergunta é "já existe uma
  # deste mês lá?", que é a condição que realmente importa.
  MES="$(date '+%Y-%m')"
  if rclone lsf "$REMOTO/mensal/" 2>/dev/null | grep -q "^banco-$MES"; then
    registrar "cópia mensal de $MES já está no remoto"
  else
    registrar "guardando a cópia mensal de $MES"
    rclone copy "$ARQ_BANCO" "$REMOTO/mensal/" --log-level NOTICE 2>&1 | tee -a "$LOG"
    rclone copy "$ARQ_FOTOS" "$REMOTO/mensal/" --log-level NOTICE 2>&1 | tee -a "$LOG"
  fi

  COPIA_EXTERNA="enviada"
fi

# -------------------------------------------------------------------- retenção
#
# Só depois de o backup do dia ter dado certo. Apagar os antigos antes seria
# trocar catorze cópias boas por nenhuma no dia em que o dump falhasse.
registrar "apagando cópias locais com mais de $DIAS dias"
find "$DESTINO" -maxdepth 1 -name 'banco-*.sql.gz' -mtime "+$DIAS" -print -delete | tee -a "$LOG"
find "$DESTINO" -maxdepth 1 -name 'fotos-*.tar.gz' -mtime "+$DIAS" -print -delete | tee -a "$LOG"

if [ "$COPIA_EXTERNA" = "enviada" ]; then
  # Cada pasta com o seu prazo. O `rclone delete` do script antigo varria o
  # remoto inteiro com um prazo só; apontado para a raiz agora, ele levaria as
  # cópias mensais junto no dia seguinte ao de serem criadas.
  rclone delete "$REMOTO/diario" --min-age "${DIAS}d" --log-level NOTICE 2>&1 | tee -a "$LOG"
  rclone delete "$REMOTO/mensal" --min-age "${DIAS_MENSAL}d" --log-level NOTICE 2>&1 | tee -a "$LOG"
fi

# Marca do último sucesso. É por este arquivo que se confere se o backup está
# mesmo acontecendo — o log cresce e ninguém lê, mas a data desta linha é uma
# olhada só, e é ela que o painel do sistema mostra quando envelhece.
#
# A data vai com fuso explícito porque quem lê o arquivo não é só gente: a
# aplicação calcula a idade dela, e a VPS pode estar em UTC.
printf '%s  cópia externa: %s\n' \
  "$(date '+%Y-%m-%dT%H:%M:%S%:z')" "$COPIA_EXTERNA" > "$ESTADO/ULTIMO-SUCESSO"

registrar "=== backup concluído (cópia externa: $COPIA_EXTERNA) ==="
