# Planeta Motores

Sistema de controle de clientes, ordens de serviço e estoque da Planeta Motores,
oficina de conserto de motores a combustão 2T e 4T.

- **Desenho (spec):** [`docs/superpowers/specs/2026-07-29-planeta-motores-design.md`](docs/superpowers/specs/2026-07-29-planeta-motores-design.md)
- **Planos:** [fundação e cadastros](docs/superpowers/plans/2026-07-29-planeta-motores-fundacao-e-cadastros.md) · [ordens de serviço e estoque](docs/superpowers/plans/2026-07-30-planeta-motores-ordens-servico-e-estoque.md) · [financeiro, documentos e implantação](docs/superpowers/plans/2026-07-30-planeta-motores-financeiro-documentos-implantacao.md)
- **Implantação:** [`docs/implantacao.md`](docs/implantacao.md)

## Situação atual

Os três planos estão implementados. O sistema cobre o spec inteiro:

| Módulo | O que faz |
|---|---|
| Ordens de serviço | Fluxo completo do recebimento à entrega, com histórico, versões de orçamento e fotos |
| Clientes | Cadastro com equipamentos 2T/4T e histórico por motor |
| Estoque | Razão de movimentos, saldo, reposição e ajuste de inventário |
| Compras | Compra de peça com custo, vínculo à OS e entrada automática no estoque |
| Financeiro | Pagamentos (inclusive sinal), contas a receber, despesas e resultado do mês |
| Documentos | Comprovante de recebimento, orçamento e recibo, em PDF |
| Avisos | Mensagem de WhatsApp montada e aberta para envio manual |
| Painel | Indicadores e listas de pendência |
| Catálogo | Serviços com preço padrão, peças e fornecedores |

Fora do escopo, por decisão registrada no spec: emissão de NFS-e, envio
automático pela API do WhatsApp, importação de clientes por planilha, acesso do
Ivan com perfil restrito, cálculo de margem por OS e aplicativo mobile.

## Stack

Next.js 15 (App Router) · TypeScript · Drizzle ORM · PostgreSQL 17 · Zod ·
Tailwind CSS v4 · Argon2id · `@react-pdf/renderer` · Vitest · Playwright

## Rodando localmente

### O banco não sobe sozinho

Nesta máquina o PostgreSQL 17 foi instalado como **binários portáteis** em
`C:\Users\walde\apps\pgsql-17`, e não como serviço do Windows — o instalador
oficial exige elevação (UAC), que não pode ser respondida de forma automatizada.

A consequência prática: **depois de reiniciar o computador, o banco precisa ser
iniciado à mão** antes de subir a aplicação.

```powershell
.\scripts\banco-local.ps1 start     # inicia
.\scripts\banco-local.ps1 status    # confere
.\scripts\banco-local.ps1 stop      # encerra
```

Se preferir que o banco suba automaticamente no boot, o caminho é instalar o
PostgreSQL como serviço (`winget install PostgreSQL.PostgreSQL.17`, aceitando o
prompt de administrador) e apontar a `DATABASE_URL` para ele. O `docker-compose.dev.yml`
no repositório é a alternativa para máquinas com Docker.

### Aplicação

```powershell
npm install
npm run banco:aplicar     # aplica as migrações
npm run dev               # http://localhost:3000
```

Acesso criado: **lucilene@planetamotores.com.br** / senha `planeta2026`.
Troque com `npm run usuario -- "Lucilene" lucilene@planetamotores.com.br <nova-senha>`.
Não existe cadastro público de usuário, por decisão do spec.

### Testes

```powershell
npm test                  # 206 testes de unidade e integração (Vitest)
npm run teste:e2e         # 28 testes ponta a ponta (Playwright)
```

Os testes usam o banco `pm_teste`, separado do `pm` de desenvolvimento, e o
esvaziam entre casos. As migrações são aplicadas automaticamente antes da suíte.

## Configuração dos bancos

| Banco | Uso | URL |
|---|---|---|
| `pm` | desenvolvimento | `postgres://pm:pm@localhost:5432/pm` (`.env`) |
| `pm_teste` | testes | `postgres://pm:pm@localhost:5432/pm_teste` (`.env.test`) |

Ambos com codificação UTF-8 e ordenação ICU `pt-BR` — necessário para que nome
acentuado ordene certo ("Óleo" antes de "Vela", não depois).

Conexões TCP usam `scram-sha-256`; o `initdb` deixaria `trust`, o que permitiria
a qualquer processo local conectar como superusuário.

## Organização do código

```
src/
  lib/          utilitários sem domínio (dinheiro, datas, quantidade, validação)
  db/           conexão e schema Drizzle
  modulos/      domínio, um diretório por módulo
  componentes/  interface sem lógica de domínio
  app/          rotas (App Router)
testes/
  unidade/      funções puras
  integracao/   regras contra Postgres real
  e2e/          navegador (Playwright)
```

Cada módulo de domínio segue a mesma divisão:

| Arquivo | Papel |
|---|---|
| `esquemas.ts` | validação Zod da entrada |
| `consultas.ts` | leitura do banco |
| `operacoes.ts` | escrita; recebe objeto já validado, devolve `Resultado` |
| `acoes.ts` | `'use server'`; converte `FormData`, chama a operação, revalida a rota |

`acoes.ts` não contém regra de negócio. Essa separação existe para que a regra
seja testável em Vitest sem simular `cookies()`, `revalidatePath()` ou
`redirect()`.

## Convenções

- Dinheiro em **centavos inteiros**, nunca ponto flutuante
- Quantidades em `numeric(12,3)`, para admitir 0,5 L de óleo
- `timestamptz` no banco, exibição no fuso `America/Sao_Paulo`
- Toda escrita passa por Server Action validada com Zod
- Server Action devolve `Resultado`, não lança exceção para a tela
- Nomes de arquivo, função, variável e coluna em português
- Saldo de estoque é a soma dos movimentos, nunca uma coluna editada
- Cobrança é derivada dos pagamentos, não é situação da OS
- Situação da OS só muda pela função de transição, que grava o histórico junto

## Armadilhas conhecidas

Anotadas porque custaram tempo e reaparecem com facilidade:

- **Subselect correlacionado em template `sql`.** O Drizzle renderiza
  `${tabela.coluna}` **sem qualificação**. Dentro de um subselect isso vira
  `where "os_id" = "id"`, e o `"id"` passa a resolver para a tabela de dentro —
  a correlação nunca casa e a soma volta zerada, sem erro nenhum. Escreva os
  identificadores à mão, com apelido na tabela interna.
- **Campo opcional em Zod precisa de `.optional()`.** Sem ele, uma chave ausente
  reprova a validação inteira, e formulário quase nunca envia todos os campos.
- **Componente de cliente não pode importar módulo de servidor.** Rótulos e
  tipos puros vão para arquivo próprio, senão o `node:fs` e o driver do Postgres
  acabam no pacote do navegador.
- **Erro do Postgres vem embrulhado pelo Drizzle.** Para reconhecer violação de
  unicidade, verifique o SQLSTATE e o nome da restrição descendo a cadeia de
  `cause` — casar por texto da mensagem não funciona.
