# Backup e restauração

O que o sistema copia, como conferir que está mesmo copiando, e como voltar
atrás quando precisar. Complementa o `docs/implantacao.md`, que trata do
snapshot da VPS.

São dois mecanismos independentes, de propósito: **o snapshot do provedor**
restaura a máquina inteira, e é o caminho normal quando a VPS se perde; **este
backup** copia banco e fotos, todo dia, para fora da VPS, e é o único caminho
quando o problema é dado apagado por engano — o snapshot mais recente já teria o
engano dentro.

## O que é copiado

| O quê | Como | Arquivo |
|---|---|---|
| Banco | `pg_dump` do contêiner do Postgres, comprimido | `banco-2026-08-17-0300.sql.gz` |
| Fotos das OS | `tar` do volume `pm-uploads` | `fotos-2026-08-17-0300.tar.gz` |

As fotos vão junto porque o `pg_dump` não pega arquivo nenhum: o banco guarda só
o caminho relativo delas. Backup sem essa parte restaura um sistema que aponta
para fotos que não existem mais.

## Onde ficam e por quanto tempo

| Lugar | Retenção | Para quê |
|---|---|---|
| `/home/planeta/backups` (disco da VPS) | 14 dias | Voltar rápido do erro de ontem |
| `b2:planeta-motores-backup/diario` | 14 dias | Mesmo prazo, fora da VPS |
| `b2:planeta-motores-backup/mensal` | 12 meses | Erro descoberto tarde |

A cópia mensal existe porque catorze dias só cobrem o engano percebido na mesma
semana. Dado apagado em março e notado em julho não sai de nenhuma cópia dessa
janela — todas já nasceram com o dado faltando. A mensal é criada a partir do
primeiro backup do mês que conseguir subir, e não no dia 1º: se a máquina
estiver fora do ar naquela madrugada, o mês inteiro ficaria sem cópia longa.

## Instalação

Tudo abaixo roda como o usuário `planeta`, na VPS.

### 1. Fuso horário da máquina

```bash
sudo timedatectl set-timezone America/Cuiaba
```

Não muda o funcionamento — os carimbos de data levam o fuso escrito dentro —,
mas sem isso `0 3 * * *` significa meia-noite de Brasília e o log fica com horas
que não batem com as do relógio de quem lê.

### 2. O diretório dos backups

```bash
mkdir -p ~/backups/estado
```

**Antes de `docker compose up`.** O `estado` é montado no contêiner da aplicação
(somente leitura) para o painel poder avisar quando o backup para. Se o Docker
subir antes de ele existir, cria o diretório sozinho e como root — e aí o
backup roda inteiro e falha só no fim, na hora de gravar o carimbo. O script
confere isso logo no começo e diz como corrigir, mas é mais simples não cair
nessa.

### 3. O cron

```bash
( crontab -l 2>/dev/null | grep -v 'scripts/backup.sh'
  echo '0 3 * * * /home/planeta/planeta-motores/scripts/backup.sh >> /home/planeta/backups/cron.log 2>&1'
) | crontab -
```

O `grep -v` deixa o comando repetível: rodar duas vezes não agenda dois backups.
Confira com `crontab -l`.

Três da manhã é a hora de menor movimento; o `pg_dump` não trava o sistema, mas
o `tar` das fotos concorre por disco.

Ficam dois arquivos de log, com papéis diferentes: `backup.log` é a narrativa
que o próprio script escreve, e é o que se lê; `cron.log` é tudo que o cron viu,
inclusive erro de permissão que aconteça antes de o script ter onde escrever.

### 4. A cópia para fora da VPS

Até aqui o backup existe só no disco que ele deveria proteger. O script **não
aborta** por causa disso — ele avisa no log e segue, para não travar o backup
local enquanto a conta do B2 não fica pronta. Enquanto estiver assim, o
`backup.log` repete todo dia:

```
AVISO: cópia para fora da VPS PULADA (rclone não instalado).
AVISO: enquanto isso o backup existe só no disco desta máquina. Ver docs/backup.md.
```

Para fechar isso:

```bash
curl https://rclone.org/install.sh | sudo bash
rclone config          # n) new remote · nome: b2 · tipo: b2 · account id + application key
rclone mkdir b2:planeta-motores-backup
```

O nome do remoto tem de ser **`b2`** e o balde **`planeta-motores-backup`**, ou
o padrão do script deixa de valer (veja a tabela de variáveis no fim).

**No painel do Backblaze, ponha o balde em "Keep only the last version of the
file".** O padrão do B2 é guardar todas as versões: a retenção deste script
apagaria os arquivos antigos e o B2 continuaria cobrando por eles para sempre,
invisíveis na listagem.

Depois de configurar, rode uma vez à mão e confira que o aviso sumiu:

```bash
~/planeta-motores/scripts/backup.sh
```

## Conferir que está funcionando

Backup que falha calado é o mesmo que não ter backup, e o log não serve de
alarme — ele cresce e ninguém lê.

**Quem confere é a tela.** O painel do sistema avisa sozinho quando o último
backup passa de 36 horas:

> A cópia de segurança do sistema não está sendo feita. Avise o Walderson.

O texto é curto de propósito: quem abre o painel todo dia não administra a VPS.
Trinta e seis horas dão folga para uma madrugada perdida e ainda assim acusam no
mesmo dia — falhou às 3h de terça, o aviso aparece às 15h de terça.

O aviso também aparece se o carimbo estiver ilegível ou o volume não estiver
montado. É deliberado: se a conferência quebrar, a tela não pode ficar calada,
porque calada é como ela fica quando está tudo certo.

Pela linha de comando:

```bash
cat ~/backups/estado/ULTIMO-SUCESSO
# 2026-08-17T03:00:12-04:00  cópia externa: enviada

tail -20 ~/backups/backup.log
ls -lh ~/backups
```

O estado da cópia externa fica nesse arquivo e no log, e **não** na tela — é
informação para quem administra, e mostrá-la todo dia a quem não pode resolver
só ensina a ignorar o aviso.

## Quando o backup aborta sozinho

O dump é conferido antes de virar backup: `gzip -t`, um piso absoluto e uma
comparação com o dump anterior.

| Mensagem no log | O que houve |
|---|---|
| `dump corrompido (gzip -t reprovou)` | O dump saiu quebrado. Confira se o Postgres está de pé |
| `abaixo do piso de 2000 bytes` | Dump vazio ou cortado no começo |
| `encolheu mais de 50%` | O dump de hoje tem menos da metade do de ontem |

O limite é relativo ao backup anterior, e não um número fixo, porque o banco
cresce: um valor fixo alto abortaria todo dia num banco novo, e um valor baixo o
bastante para caber no banco de hoje nunca mais dispararia depois que ele
dobrasse de tamanho. Na primeira execução, sem nada com que comparar, vale só o
piso.

**O aborto é a parte que funciona.** O backup do dia não é gravado, os antigos
não são apagados, e o carimbo não é atualizado — então em até 36 horas o painel
avisa. Se o banco encolheu de verdade (uma limpeza, uma migração que apagou
tabela), rode uma vez com o limite solto:

```bash
ENCOLHIMENTO_MAXIMO=100 ~/planeta-motores/scripts/backup.sh
```

## Ensaio de restauração

**Faça um agora, na instalação, e repita a cada três meses.** Backup que nunca
foi restaurado é uma suposição, não uma garantia — e o dia de descobrir que o
dump não carrega não pode ser o dia em que o banco se perdeu.

Sem `--producao` nada encosta no sistema no ar: o dump vai para um banco
descartável e as fotos para um diretório temporário. Dá para fazer com a oficina
funcionando.

### 1. Um backup na hora

```bash
cd ~/planeta-motores
./scripts/backup.sh
```

Confira, no fim da saída:

```
banco: banco-2026-08-17-1432.sql.gz (5244 bytes)
fotos: fotos-2026-08-17-1432.tar.gz (10240 bytes)
=== backup concluído (cópia externa: enviada) ===
```

- **`=== backup concluído`** tem de aparecer. Sem essa linha, parou no meio e a
  linha anterior diz onde.
- **O tamanho do banco** em bytes. Guarde o número: é com ele que o backup de
  amanhã vai ser comparado.
- Na primeira execução aparece `primeiro backup neste diretório`. A partir da
  segunda, `tamanho conferido contra banco-...`.
- Se disser `cópia externa: PULADA`, o B2 ainda não está configurado — o ensaio
  vale do mesmo jeito.

### 2. Restaurar em modo ensaio

Use os nomes de arquivo que o passo 1 imprimiu:

```bash
./scripts/restaurar.sh --banco ~/backups/banco-2026-08-17-1432.sql.gz \
                       --fotos ~/backups/fotos-2026-08-17-1432.tar.gz
```

Confira, em ordem:

**a) O banco de espera nasceu.** A saída mostra `recriando o banco
'pm_restauracao'` e **nenhuma mensagem de erro do Postgres em seguida**. Este é
o passo que prova a colação: o `create database` pede `locale_provider icu` com
`icu_locale 'pt-BR'`, e um cluster que não aceite isso falha aqui, não na hora
do aperto.

**b) O dump carregou inteiro.** Depois de `carregando o dump` não pode aparecer
nada. O `psql` roda com `ON_ERROR_STOP=1`: qualquer linha `ERROR:` interrompe e
o script para. Silêncio é a resposta certa.

**c) As contagens.** Sai uma tabela:

```
 clientes       |  38
 despesas       |  12
 ordens_servico | 137
 pagamentos     |  94
 usuarios       |   1
```

`usuarios` **não pode ser zero** — não existe cadastro público, ninguém
conseguiria entrar num sistema restaurado sem usuário. Os outros números têm de
parecer com os da oficina de hoje; muito menores significam dump velho.

**d) As fotos.** `ensaio: extraído em /tmp/tmp.XXXX` seguido de `arquivos: N`,
com N batendo com a quantidade de fotos que a oficina tem.

### 3. Conferir a ordenação de nome acentuado

O ensaio acima prova que o dump carrega. Este passo prova que ele carrega **com
a ordenação certa** — é o motivo de a colação ir escrita à mão no
`restaurar.sh`, e o teste não custa nada:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U pm -d pm_restauracao -tAc "select 'Álvaro' < 'Beatriz'"
```

Tem de responder **`t`**. Se responder `f`, o banco restaurado está comparando
byte a byte e a lista de clientes sairia com todo nome acentuado no fim.

### 4. Limpar

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U pm -d postgres -c 'drop database pm_restauracao'
rm -rf /tmp/tmp.XXXX          # o diretório que o passo 2d imprimiu
```

O `pm_restauracao` é uma cópia inteira do banco ocupando disco. O ensaio
seguinte o recria de qualquer jeito, mas não há motivo para deixá-lo lá.

## Restaurar de verdade

```bash
./scripts/restaurar.sh --banco ~/backups/banco-2026-08-17-0300.sql.gz --producao
```

A ordem importa e é o que o script garante:

1. Pede a primeira confirmação (`RESTAURAR`).
2. Carrega o dump em `pm_restauracao`, **com o sistema no ar**. É o passo
   demorado e o que costuma falhar; se falhar aqui, o banco `pm` não foi tocado
   e ninguém percebeu nada.
3. Mostra as contagens e confere sozinho que existe pelo menos um usuário.
4. Pede a segunda confirmação (`TROCAR`), já com as contagens na tela.
5. Só então para a aplicação, renomeia `pm` para `pm_antigo_<data>`, renomeia
   `pm_restauracao` para `pm`, e sobe a aplicação. O site fica fora do ar por
   alguns segundos — o tempo de duas renomeações.

**Nada é apagado.** O banco anterior continua no cluster com outro nome. Confira
o sistema no navegador antes de apagá-lo:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U pm -d postgres -c 'drop database pm_antigo_20260817_031500'
```

### Os `pm_antigo_` se acumulam

Cada restauração em produção deixa um banco `pm_antigo_<data>` para trás, e o
script **nunca apaga nenhum** — apagar sozinho o único lugar onde ainda existe o
estado anterior anularia o motivo de ele existir. Em compensação, cada um é uma
cópia inteira do banco ocupando disco, e ninguém lembra deles depois que o
sistema volta a funcionar.

Liste o que está lá e o tamanho de cada um:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres psql -U pm -d postgres -c \
  "select datname, pg_size_pretty(pg_database_size(datname)) as tamanho
     from pg_database where datname like 'pm\_antigo\_%' order by datname"
```

```
       datname        | tamanho
----------------------+---------
 pm_antigo_20260817_031500 | 9861 kB
```

Apague um a um, **depois de o sistema estar rodando bem há alguns dias**:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U pm -d postgres -c 'drop database pm_antigo_20260817_031500'
```

Não existe automação para isso de propósito. Restauração em produção é evento
raro — se houver mais de um ou dois `pm_antigo_` no cluster, o problema a
investigar não é o disco.

Vale a mesma olhada na hora do ensaio trimestral: é o momento em que você já
está com o `psql` aberto.

Se o script morrer com a aplicação parada — erro, Ctrl-C, conexão caindo —, ele
sobe a aplicação de volta e diz isso em voz alta antes de sair. Sair calado
deixando o site fora do ar é a única falha que este script não pode ter.

As fotos são um comando à parte, porque quase nunca é preciso restaurar as duas
coisas:

```bash
./scripts/restaurar.sh --fotos ~/backups/fotos-2026-08-17-0300.tar.gz --producao
```

## Se a VPS inteira se perdeu

1. Levante a máquina nova seguindo `docs/implantacao.md` até o passo 5, sem
   criar usuário.
2. Baixe o backup mais recente do B2 (`rclone copy b2:planeta-motores-backup/diario ~/backups`
   — ou de `mensal`, se o problema for antigo).
3. Restaure banco e fotos com `--producao`.

Não rode as migrações depois de restaurar: o dump já vem com o schema na versão
em que estava.

## Variáveis

Todas têm padrão para a instalação da VPS; existem para o ensaio e para o dia em
que algo mudar de lugar.

| Variável | Padrão | Onde |
|---|---|---|
| `RAIZ` | `/home/planeta/planeta-motores` | ambos |
| `DESTINO` | `/home/planeta/backups` | `backup.sh` |
| `REMOTO` | `b2:planeta-motores-backup` | `backup.sh` |
| `DIAS` | `14` | `backup.sh` |
| `DIAS_MENSAL` | `365` | `backup.sh` |
| `PISO_BYTES` | `2000` | `backup.sh` |
| `ENCOLHIMENTO_MAXIMO` | `50` | `backup.sh` |
| `CAMINHO_ULTIMO_BACKUP` | `/estado/ULTIMO-SUCESSO` | aplicação |
| `DIR_BACKUPS` | `/home/planeta/backups` | `docker-compose.prod.yml` |
