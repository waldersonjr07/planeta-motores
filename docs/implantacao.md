# Implantação na VPS

Roteiro para colocar o sistema no ar. Escrito para ser seguido de cima para
baixo, sem pular etapa.

## Antes de começar

Contrate uma VPS **em São Paulo** com 2 vCPU, 4 GB de memória e ~60 GB de disco.
A região importa: o sistema faz uma ida ao servidor a cada salvamento, e uma VPS
na Europa acrescenta cerca de 200 ms por clique — funciona, mas dá sensação de
lentidão.

Aponte um domínio (ou subdomínio) para o IP da VPS antes do passo 5. O
certificado HTTPS é emitido pelo próprio Caddy, e ele precisa do DNS já
resolvendo.

## 1. Usuário sem privilégio

Entrar como root e criar um usuário para o sistema:

```bash
adduser planeta
usermod -aG sudo planeta
su - planeta
```

Rodar a aplicação como root não traz nada e amplia o estrago de qualquer falha.

## 2. Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker planeta
# sair e entrar de novo para o grupo valer
exit
```

## 3. Código e configuração

```bash
git clone https://github.com/waldersonjr07/planeta-motores.git
cd planeta-motores
```

Criar o `.env` na raiz:

```
POSTGRES_PASSWORD=<senha longa e aleatória>
DOMINIO=sistema.planetamotores.com.br
```

Gere a senha com `openssl rand -hex 32` — **não** com `base64`. Esta senha é
interpolada dentro de uma URL (`postgres://pm:SENHA@postgres:5432/pm`), e o
alfabeto do base64 inclui a barra: uma `/` sorteada no meio da senha encerra a
seção de autoridade da URL, e o driver passa a procurar um host que não existe.
O erro que aparece não fala em senha, então custa caro de diagnosticar.
Hexadecimal usa só `0-9a-f`, que atravessa a URL intacto.

Ela não aparece em lugar nenhum além deste arquivo — guarde uma cópia junto com
as suas outras senhas.

## 4. Subir

Antes de subir, crie o diretório dos backups:

```bash
mkdir -p ~/backups/estado
```

A pasta `estado` é montada no contêiner da aplicação para o painel poder avisar
quando o backup parar. Se ela não existir agora, o Docker a cria sozinho e como
root, e depois o backup não consegue gravar nada nela.

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Conferir que os três serviços estão de pé:

```bash
docker compose -f docker-compose.prod.yml ps
```

## 5. Migrações e usuário de acesso

```bash
docker compose -f docker-compose.prod.yml exec app npx drizzle-kit migrate
docker compose -f docker-compose.prod.yml exec app npx tsx scripts/criar-usuario.ts \
  "Lucilene" lucilene@planetamotores.com.br '<senha da Lucilene>'
```

Não existe cadastro público de usuário — este comando é a única porta de
entrada, por decisão do desenho.

## 6. Conferir

Abrir `https://<seu domínio>` e entrar. Percorrer uma OS de ponta a ponta:
abrir, diagnosticar, orçar, aprovar, concluir e entregar, verificando que o
estoque baixou.

## 7. Backup — o passo que não pode ser adiado

**Contrate o snapshot automático da VPS no painel do provedor.** Costuma custar
cerca de 20% do valor mensal da máquina.

Este é o único ponto deste roteiro onde economizar sai caro. Ao escolher VPS em
vez de plataforma gerenciada, o backup deixou de vir incluído e passou a ser
responsabilidade sua. E backup guardado no mesmo disco que ele deveria proteger
não é backup: um disco perdido leva o sistema e todo o histórico da oficina
junto.

**Depois do snapshot, siga o `docs/backup.md` até o fim** — cron, cópia para
fora da VPS e o ensaio de restauração. O snapshot restaura a máquina inteira e
não resolve dado apagado por engano: o snapshot mais recente já teria o engano
dentro.

Os dois mecanismos são independentes, o que é exatamente a intenção.

## Manutenção recorrente

O que passou a ser tarefa sua ao escolher VPS:

| Quando | O quê |
|---|---|
| Mensal | `sudo apt update && sudo apt upgrade` e reiniciar se pedir |
| Mensal | Conferir no painel do provedor que o snapshot **está mesmo sendo gerado** — ele não avisa quando para |
| Mensal | Baixar a exportação em CSV e guardar fora da VPS |
| Trimestral | Ensaio de restauração — `docs/backup.md` |
| A cada atualização | `git pull && docker compose -f docker-compose.prod.yml up -d --build` e, se houver migração nova, rodar `drizzle-kit migrate` |

O backup diário não entra nesta tabela de propósito: quem confere se ele está
acontecendo é o painel do sistema, que avisa sozinho quando o último passa de 36
horas. Tarefa que depende de alguém lembrar de olhar é tarefa que uma hora para
de ser feita.

## Restaurar

Pelo snapshot do provedor, restaura-se a máquina inteira — é o caminho normal
quando o problema é a máquina.

Quando o problema é o dado — algo apagado por engano —, o caminho é o
`scripts/restaurar.sh`, documentado em `docs/backup.md`. Ele carrega o dump num
banco à parte, mostra as contagens e só troca os nomes depois que você confirmar:

```bash
./scripts/restaurar.sh --banco ~/backups/banco-2026-08-17-0300.sql.gz --producao
```

Não carregue um dump por cima do banco `pm` à mão. Sem `ON_ERROR_STOP`, o `psql`
segue depois de um erro e termina com sucesso sobre um banco pela metade.

## Ver o que está acontecendo

```bash
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f caddy
```
