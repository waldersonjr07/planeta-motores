# Planeta Motores — Plano 1: Fundação e Cadastros

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o sistema rodando com login, dados da empresa e os cadastros de clientes, equipamentos, serviços, peças e fornecedores — a base sobre a qual a ordem de serviço é construída no Plano 2.

**Architecture:** Monolito Next.js (App Router) com Server Actions como única fronteira de escrita, Drizzle ORM sobre Postgres, e cada módulo de domínio numa pasta própria (`src/modulos/<nome>`) com três arquivos de responsabilidade fixa: `esquemas.ts` (validação Zod), `consultas.ts` (leitura) e `acoes.ts` (escrita via Server Action). Nenhum módulo importa a tabela de outro.

**Tech Stack:** Next.js 15+ (App Router), TypeScript, Drizzle ORM + drizzle-kit, Postgres 16, postgres.js, Zod, Tailwind CSS v4, `@node-rs/argon2`, Vitest, Playwright, Docker Compose (Postgres local).

**Spec:** `docs/superpowers/specs/2026-07-29-planeta-motores-design.md`

## Global Constraints

- Node 22 ou superior; Next.js 15 ou superior (App Router).
- Valores monetários são **inteiros em centavos**. Nunca ponto flutuante para dinheiro.
- Quantidades em `numeric(12,3)` no banco, para admitir fração (0,5 L de óleo).
- Datas e horas em `timestamptz`. Exibição sempre no fuso `America/Sao_Paulo`.
- Identificadores de linha em `uuid` com `defaultRandom()`. Exceções: `sessoes.id` (hash do token) e `configuracoes.id` (inteiro fixo `1`).
- Toda tabela tem coluna `criado_em` com `defaultNow()`.
- Toda escrita passa por Server Action validada com Zod. Nenhuma escrita direta a partir de componente.
- Server Action nunca lança erro para a tela: retorna `Resultado<T>`.
- Mensagens de erro em português, dirigidas ao usuário.
- Nenhum módulo consulta ou escreve tabela de outro módulo. A comunicação é por função exportada.
- **Código em português**: nomes de arquivo, pasta, função, variável e coluna. Exceções são as convenções obrigatórias do Next.js (`app/`, `page.tsx`, `layout.tsx`, `route.ts`, `middleware.ts`) e de bibliotecas.
- Sem cadastro público de usuário. Usuário é criado por script administrativo.
- Um teste por comportamento, com asserção específica. Não escreva teste que apenas confirma que a função existe.

## Estrutura de arquivos

**Raiz**

| Arquivo | Responsabilidade |
|---|---|
| `package.json`, `tsconfig.json`, `next.config.ts` | Projeto e compilação |
| `postcss.config.mjs` | Tailwind v4 via PostCSS |
| `drizzle.config.ts` | Geração e aplicação de migrações |
| `vitest.config.ts` | Testes de unidade e integração |
| `playwright.config.ts` | Teste ponta a ponta |
| `docker-compose.dev.yml` | Postgres local (banco de desenvolvimento e de teste) |
| `docker/postgres-init/01-cria-banco-de-teste.sql` | Cria `pm_teste` na subida do contêiner |
| `.env.example`, `.env`, `.env.test` | Configuração por ambiente |

**`src/lib` — utilitários sem conhecimento de domínio**

| Arquivo | Responsabilidade |
|---|---|
| `dinheiro.ts` | Conversão e formatação de centavos |
| `datas.ts` | Formatação e contagem de dias no fuso de São Paulo |
| `resultado.ts` | Tipo de retorno das Server Actions |
| `validacao.ts` | Validadores Zod compartilhados (documento, telefone, CEP) |

**`src/db` — banco**

| Arquivo | Responsabilidade |
|---|---|
| `index.ts` | Conexão Drizzle única |
| `schema/index.ts` | Reexporta todas as tabelas |
| `schema/usuarios.ts` | `usuarios`, `sessoes` |
| `schema/configuracoes.ts` | `configuracoes` |
| `schema/clientes.ts` | `clientes`, `equipamentos` |
| `schema/catalogo.ts` | `servicos`, `pecas`, `fornecedores` |

**`src/modulos` — domínio**

| Pasta | Arquivos |
|---|---|
| `auth/` | `senha.ts`, `sessao.ts`, `autenticacao.ts`, `guarda.ts`, `esquemas.ts`, `acoes.ts` |
| `configuracoes/` | `esquemas.ts`, `consultas.ts`, `operacoes.ts`, `acoes.ts` |
| `clientes/` | `esquemas.ts`, `consultas.ts`, `operacoes.ts`, `acoes.ts` e os equivalentes `equipamentos-*.ts` |
| `catalogo/` | um trio `<cadastro>-esquemas.ts`, `<cadastro>-operacoes.ts`, `<cadastro>-consultas.ts` para `servicos`, `pecas` e `fornecedores`, mais um `acoes.ts` comum |

**Divisão de responsabilidade dentro do módulo** — vale para todos:

| Arquivo | Papel | Testável sem Next? |
|---|---|---|
| `esquemas.ts` | Validação Zod da entrada | sim |
| `consultas.ts` | Leitura do banco | sim |
| `operacoes.ts` | Escrita: recebe objeto **já validado**, devolve `Resultado` | sim |
| `acoes.ts` | `'use server'`: converte `FormData`, chama a operação, revalida a rota | só por e2e |

Essa separação existe para que a regra de negócio seja testada em Vitest sem simular `cookies()`, `revalidatePath()` ou `redirect()`. `acoes.ts` não contém regra — se você precisar testar algo que está lá, está no arquivo errado.

**`src/app` — telas**

| Caminho | Responsabilidade |
|---|---|
| `layout.tsx`, `globals.css` | Casca HTML e estilos base |
| `(auth)/entrar/page.tsx` | Login |
| `(app)/layout.tsx` | Menu lateral e guarda de sessão |
| `(app)/clientes/` | Lista, formulário e ficha |
| `(app)/catalogo/servicos|pecas|fornecedores/` | Cadastros do catálogo |
| `(app)/configuracoes/page.tsx` | Dados da empresa |

**`src/componentes`** — `botao.tsx`, `campo.tsx`, `tabela.tsx`, `mensagem-erro.tsx`: componentes de interface sem lógica de domínio.

**`scripts/criar-usuario.ts`** — cria ou atualiza o usuário de acesso.

**`testes`** — `unidade/`, `integracao/`, `e2e/`, `ajuda/banco.ts`, `ajuda/setup-global.ts`.

---

### Task 1: Esqueleto do projeto e Postgres local

Entrega: `npm run dev` sobe a aplicação, `npm test` roda contra um Postgres real.

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.env.example`, `.env`, `.env.test`, `.gitignore` (modificar), `docker-compose.dev.yml`, `docker/postgres-init/01-cria-banco-de-teste.sql`, `drizzle.config.ts`, `vitest.config.ts`, `src/db/index.ts`, `src/db/schema/index.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Test: `testes/integracao/conexao.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `db` (instância Drizzle) e `type Db` de `src/db/index.ts`; variável de ambiente `DATABASE_URL`.

- [ ] **Step 1: Criar o projeto Next.js e instalar dependências**

```bash
npx create-next-app@latest . --typescript --app --tailwind --eslint --src-dir --import-alias "@/*" --use-npm
npm install drizzle-orm postgres zod
npm install -D drizzle-kit vitest dotenv @types/node tsx
```

Se o `create-next-app` reclamar que o diretório não está vazio, responda que sim para prosseguir — `docs/`, `.gitignore` e `.git` são preservados.

- [ ] **Step 2: Subir o Postgres local**

`docker-compose.dev.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: pm-postgres
    environment:
      POSTGRES_USER: pm
      POSTGRES_PASSWORD: pm
      POSTGRES_DB: pm
    ports:
      - "5432:5432"
    volumes:
      - pm-dados:/var/lib/postgresql/data
      - ./docker/postgres-init:/docker-entrypoint-initdb.d
volumes:
  pm-dados:
```

`docker/postgres-init/01-cria-banco-de-teste.sql`:

```sql
CREATE DATABASE pm_teste OWNER pm;
```

Run: `docker compose -f docker-compose.dev.yml up -d`
Expected: contêiner `pm-postgres` em execução.

- [ ] **Step 3: Configurar ambiente**

`.env.example`:

```
DATABASE_URL=postgres://pm:pm@localhost:5432/pm
```

`.env`: mesma linha. `.env.test`:

```
DATABASE_URL=postgres://pm:pm@localhost:5432/pm_teste
```

Acrescentar ao `.gitignore`: `.env.test`.

- [ ] **Step 4: Escrever o teste de conexão que falha**

`testes/integracao/conexao.test.ts`:

```ts
import { sql } from 'drizzle-orm'
import { expect, test } from 'vitest'
import { db } from '../../src/db'

test('a conexão responde a uma consulta trivial', async () => {
  const linhas = await db.execute(sql`select 1 as um`)
  expect(linhas[0].um).toBe(1)
})

test('a conexão aponta para o banco de teste', async () => {
  const linhas = await db.execute(sql`select current_database() as banco`)
  expect(linhas[0].banco).toBe('pm_teste')
})
```

`vitest.config.ts`:

```ts
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

export default defineConfig({
  resolve: {
    // O código da aplicação importa por "@/", e o Vitest não lê os paths do
    // tsconfig por conta própria.
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    include: ['testes/**/*.test.ts'],
    exclude: ['testes/e2e/**'],
    fileParallelism: false,
  },
})
```

`fileParallelism: false` é deliberado: os testes de integração compartilham um banco e limpam tabelas entre casos. Os testes importam da aplicação por caminho relativo (`../../src/...`); o alias existe para quando o código importado usa `@/` internamente.

- [ ] **Step 5: Rodar o teste e confirmar a falha**

Run: `npx vitest run testes/integracao/conexao.test.ts`
Expected: FAIL — não resolve `../../src/db`.

- [ ] **Step 6: Criar a conexão**

`src/db/schema/index.ts`:

```ts
export {}
```

`src/db/index.ts`:

```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL não definida')

const cliente = postgres(url, { max: 5 })

export const db = drizzle(cliente, { schema })
export type Db = typeof db
```

- [ ] **Step 7: Rodar o teste e confirmar que passa**

Run: `npx vitest run testes/integracao/conexao.test.ts`
Expected: PASS, 2 testes.

- [ ] **Step 8: Configurar o drizzle-kit e os scripts do npm**

`drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit'
import dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

Em `package.json`, acrescentar aos `scripts`:

```json
{
  "test": "vitest run",
  "banco:gerar": "drizzle-kit generate",
  "banco:aplicar": "drizzle-kit migrate"
}
```

- [ ] **Step 9: Verificar que a aplicação sobe**

Run: `npm run dev`
Expected: responde em `http://localhost:3000` sem erro no console. Encerrar com Ctrl+C.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Cria esqueleto do projeto com Next.js, Postgres e Vitest"
```

---

### Task 2: Formatação de dinheiro e datas

Entrega: as duas conversões que aparecem em toda tela do sistema, testadas nos casos que costumam quebrar.

**Files:**
- Create: `src/lib/dinheiro.ts`, `src/lib/datas.ts`
- Test: `testes/unidade/dinheiro.test.ts`, `testes/unidade/datas.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `formatarReais(centavos: number): string` — `152340` → `"R$ 1.523,40"`
  - `parsearReais(texto: string): number | null` — `"1.523,40"` → `152340`; `null` quando inválido
  - `FUSO: 'America/Sao_Paulo'`
  - `formatarData(valor: Date): string` — `"29/07/2026"`
  - `formatarDataHora(valor: Date): string` — `"29/07/2026 14:32"`
  - `diasDesde(valor: Date, referencia?: Date): number`

- [ ] **Step 1: Escrever os testes de dinheiro que falham**

`testes/unidade/dinheiro.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { formatarReais, parsearReais } from '../../src/lib/dinheiro'

describe('formatarReais', () => {
  test('formata milhar com ponto e centavo com vírgula', () => {
    expect(formatarReais(152340)).toBe('R$ 1.523,40')
  })

  test('usa espaço comum, não espaço inquebrável', () => {
    expect(formatarReais(500)).toBe('R$ 5,00')
    expect(formatarReais(500)).not.toContain(' ')
  })

  test('formata zero', () => {
    expect(formatarReais(0)).toBe('R$ 0,00')
  })
})

describe('parsearReais', () => {
  test('aceita valor com separador de milhar', () => {
    expect(parsearReais('1.523,40')).toBe(152340)
  })

  test('aceita valor sem centavo', () => {
    expect(parsearReais('230')).toBe(23000)
  })

  test('aceita prefixo de moeda', () => {
    expect(parsearReais('R$ 62,00')).toBe(6200)
  })

  test('arredonda o centavo em vez de truncar', () => {
    expect(parsearReais('0,1')).toBe(10)
  })

  test('recusa texto que não é valor', () => {
    expect(parsearReais('abc')).toBeNull()
    expect(parsearReais('')).toBeNull()
    expect(parsearReais('1,234')).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run testes/unidade/dinheiro.test.ts`
Expected: FAIL — não resolve `src/lib/dinheiro`.

- [ ] **Step 3: Implementar `dinheiro.ts`**

```ts
const formatador = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/** Converte centavos inteiros no texto exibido ao usuário. */
export function formatarReais(centavos: number): string {
  // O Intl usa espaço inquebrável depois de "R$"; normalizamos para espaço
  // comum, senão comparação de texto e busca na tela ficam imprevisíveis.
  return formatador.format(centavos / 100).replace(/ /g, ' ')
}

const PADRAO = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/

/** Converte o que o usuário digitou em centavos inteiros. `null` se inválido. */
export function parsearReais(texto: string): number | null {
  const limpo = texto.trim().replace(/^R\$\s*/, '')
  if (!PADRAO.test(limpo)) return null
  const valor = Number(limpo.replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(valor)) return null
  return Math.round(valor * 100)
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run testes/unidade/dinheiro.test.ts`
Expected: PASS, 8 testes.

- [ ] **Step 5: Escrever os testes de datas que falham**

`testes/unidade/datas.test.ts`:

```ts
import { expect, test } from 'vitest'
import { diasDesde, formatarData, formatarDataHora } from '../../src/lib/datas'

test('formata a data no padrão brasileiro', () => {
  expect(formatarData(new Date('2026-07-29T12:00:00Z'))).toBe('29/07/2026')
})

test('converte o instante para o fuso de São Paulo', () => {
  // 02:00 UTC de 30/07 ainda é 23:00 de 29/07 em São Paulo (UTC-3)
  expect(formatarData(new Date('2026-07-30T02:00:00Z'))).toBe('29/07/2026')
})

test('formata data e hora sem vírgula entre elas', () => {
  expect(formatarDataHora(new Date('2026-07-29T17:32:00Z'))).toBe('29/07/2026 14:32')
})

test('conta dias inteiros entre duas datas', () => {
  const referencia = new Date('2026-07-29T12:00:00Z')
  expect(diasDesde(new Date('2026-07-22T12:00:00Z'), referencia)).toBe(7)
  expect(diasDesde(referencia, referencia)).toBe(0)
})

test('conta o dia virado mesmo com poucas horas de diferença', () => {
  // 23:00 de 28/07 em São Paulo para 01:00 de 29/07: um dia de diferença
  expect(
    diasDesde(new Date('2026-07-29T02:00:00Z'), new Date('2026-07-29T04:00:00Z')),
  ).toBe(1)
})
```

- [ ] **Step 6: Rodar e confirmar a falha**

Run: `npx vitest run testes/unidade/datas.test.ts`
Expected: FAIL — não resolve `src/lib/datas`.

- [ ] **Step 7: Implementar `datas.ts`**

```ts
export const FUSO = 'America/Sao_Paulo'

const somenteData = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dataComHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatarData(valor: Date): string {
  return somenteData.format(valor)
}

export function formatarDataHora(valor: Date): string {
  return dataComHora.format(valor).replace(', ', ' ')
}

/** Meia-noite do dia civil de São Paulo, expressa em milissegundos UTC. */
function diaCivil(valor: Date): number {
  const [dia, mes, ano] = somenteData.format(valor).split('/').map(Number)
  return Date.UTC(ano, mes - 1, dia)
}

/**
 * Dias inteiros decorridos, comparando dias civis e não intervalos de 24 h —
 * é assim que a Lucilene conta "quatro dias sem resposta".
 */
export function diasDesde(valor: Date, referencia = new Date()): number {
  const umDia = 86_400_000
  return Math.round((diaCivil(referencia) - diaCivil(valor)) / umDia)
}
```

- [ ] **Step 8: Rodar e confirmar que passa**

Run: `npx vitest run testes/unidade/datas.test.ts`
Expected: PASS, 5 testes.

- [ ] **Step 9: Commit**

```bash
git add src/lib testes/unidade
git commit -m "Adiciona formatacao de dinheiro em centavos e de datas no fuso de Sao Paulo"
```

---

### Task 3: Tipo `Resultado` e validadores compartilhados

Entrega: o contrato de retorno de toda Server Action e os validadores de documento, telefone e CEP.

**Files:**
- Create: `src/lib/resultado.ts`, `src/lib/validacao.ts`
- Test: `testes/unidade/resultado.test.ts`, `testes/unidade/validacao.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type Resultado<T> = { ok: true; dados: T } | { ok: false; erro: string; campos?: Record<string, string> }`
  - `sucesso<T>(dados: T): Resultado<T>`
  - `falha(erro: string, campos?: Record<string, string>): Resultado<never>`
  - `falhaDeValidacao(erro: ZodError): Resultado<never>`
  - `apenasDigitos(valor: string): string`
  - `documentoOpcional`, `telefoneOpcional`, `cepOpcional` — esquemas Zod que devolvem `string | null`
  - `textoObrigatorio(rotulo: string)` — esquema Zod

- [ ] **Step 1: Escrever os testes que falham**

`testes/unidade/resultado.test.ts`:

```ts
import { expect, test } from 'vitest'
import { z } from 'zod'
import { falha, falhaDeValidacao, sucesso } from '../../src/lib/resultado'

test('sucesso carrega os dados', () => {
  const r = sucesso({ id: 'abc' })
  expect(r).toEqual({ ok: true, dados: { id: 'abc' } })
})

test('falha carrega a mensagem', () => {
  expect(falha('Cliente não encontrado.')).toEqual({
    ok: false,
    erro: 'Cliente não encontrado.',
  })
})

test('falhaDeValidacao mapeia cada campo para a primeira mensagem', () => {
  const esquema = z.object({ nome: z.string().min(1, 'Nome é obrigatório') })
  const analise = esquema.safeParse({ nome: '' })
  if (analise.success) throw new Error('o esquema deveria ter recusado')

  const r = falhaDeValidacao(analise.error)
  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.campos).toEqual({ nome: 'Nome é obrigatório' })
  expect(r.erro).toBe('Confira os campos destacados.')
})
```

`testes/unidade/validacao.test.ts`:

```ts
import { expect, test } from 'vitest'
import {
  apenasDigitos,
  cepOpcional,
  documentoOpcional,
  telefoneOpcional,
  textoObrigatorio,
} from '../../src/lib/validacao'

test('apenasDigitos remove pontuação', () => {
  expect(apenasDigitos('123.456.789-00')).toBe('12345678900')
})

test('documento aceita CPF e CNPJ, guardando só os dígitos', () => {
  expect(documentoOpcional.parse('123.456.789-00')).toBe('12345678900')
  expect(documentoOpcional.parse('12.345.678/0001-95')).toBe('12345678000195')
})

test('documento vazio virá nulo', () => {
  expect(documentoOpcional.parse('')).toBeNull()
})

test('documento com quantidade errada de dígitos é recusado', () => {
  expect(() => documentoOpcional.parse('123')).toThrow()
})

test('telefone aceita 10 e 11 dígitos', () => {
  expect(telefoneOpcional.parse('(11) 98765-4321')).toBe('11987654321')
  expect(telefoneOpcional.parse('1132654321')).toBe('1132654321')
  expect(() => telefoneOpcional.parse('987654321')).toThrow()
})

test('CEP exige 8 dígitos', () => {
  expect(cepOpcional.parse('04567-000')).toBe('04567000')
  expect(() => cepOpcional.parse('4567')).toThrow()
})

test('textoObrigatorio recusa espaço em branco e apara as bordas', () => {
  expect(textoObrigatorio('Nome').parse('  Ivan  ')).toBe('Ivan')
  expect(() => textoObrigatorio('Nome').parse('   ')).toThrow('Nome é obrigatório')
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run testes/unidade/resultado.test.ts testes/unidade/validacao.test.ts`
Expected: FAIL — não resolve os dois módulos.

- [ ] **Step 3: Implementar `resultado.ts`**

```ts
import type { ZodError } from 'zod'

/**
 * Retorno de toda Server Action. Erro esperado é dado de retorno, não exceção:
 * a tela precisa exibir a mensagem sem derrubar a navegação.
 */
export type Resultado<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string; campos?: Record<string, string> }

export function sucesso<T>(dados: T): Resultado<T> {
  return { ok: true, dados }
}

export function falha(
  erro: string,
  campos?: Record<string, string>,
): Resultado<never> {
  return campos ? { ok: false, erro, campos } : { ok: false, erro }
}

export function falhaDeValidacao(erro: ZodError): Resultado<never> {
  const campos: Record<string, string> = {}
  for (const problema of erro.issues) {
    const campo = problema.path.join('.')
    if (campo && !(campo in campos)) campos[campo] = problema.message
  }
  return falha('Confira os campos destacados.', campos)
}
```

- [ ] **Step 4: Implementar `validacao.ts`**

```ts
import { z } from 'zod'

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

function opcionalComDigitos(
  tamanhosAceitos: number[],
  mensagem: string,
) {
  return z
    .string()
    .optional()
    // Campo opcional precisa aceitar a chave ausente: formulário que não tem o
    // campo não envia nada, e reprovar isso quebraria a tela por nada.
    .transform((v) => apenasDigitos(v ?? ''))
    .refine((v) => v === '' || tamanhosAceitos.includes(v.length), { message: mensagem })
    .transform((v) => (v === '' ? null : v))
}

export const documentoOpcional = opcionalComDigitos(
  [11, 14],
  'Informe um CPF com 11 dígitos ou um CNPJ com 14 dígitos',
)

export const telefoneOpcional = opcionalComDigitos(
  [10, 11],
  'Informe o telefone com DDD',
)

export const cepOpcional = opcionalComDigitos([8], 'O CEP tem 8 dígitos')

export function textoObrigatorio(rotulo: string) {
  return z.string().trim().min(1, `${rotulo} é obrigatório`)
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx vitest run testes/unidade/resultado.test.ts testes/unidade/validacao.test.ts`
Expected: PASS, 10 testes.

- [ ] **Step 6: Commit**

```bash
git add src/lib testes/unidade
git commit -m "Adiciona tipo Resultado e validadores de documento, telefone e CEP"
```

---

### Task 4: Schema de acesso e configurações, com apoio de teste ao banco

Entrega: as tabelas `usuarios`, `sessoes` e `configuracoes` migradas, e o utilitário que limpa o banco entre testes — sem o qual nenhuma tarefa seguinte é testável.

**Files:**
- Create: `src/db/schema/usuarios.ts`, `src/db/schema/configuracoes.ts`, `testes/ajuda/banco.ts`, `testes/ajuda/setup-global.ts`
- Modify: `src/db/schema/index.ts` (reexportar as tabelas), `vitest.config.ts` (registrar o setup global)
- Test: `testes/integracao/schema-base.test.ts`

**Interfaces:**
- Consumes: `db` de `src/db/index.ts`.
- Produces:
  - tabelas `usuarios`, `sessoes`, `configuracoes`
  - `limparBanco(): Promise<void>` de `testes/ajuda/banco.ts`

- [ ] **Step 1: Escrever o teste que falha**

`testes/integracao/schema-base.test.ts`:

```ts
import { eq } from 'drizzle-orm'
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { configuracoes, sessoes, usuarios } from '../../src/db/schema'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

test('grava um usuário com valores padrão', async () => {
  const [criado] = await db
    .insert(usuarios)
    .values({ nome: 'Lucilene', email: 'lucilene@planetamotores.com.br', senhaHash: 'x' })
    .returning()

  expect(criado.id).toMatch(/^[0-9a-f-]{36}$/)
  expect(criado.ativo).toBe(true)
  expect(criado.criadoEm).toBeInstanceOf(Date)
})

test('o e-mail do usuário é único', async () => {
  const dados = { nome: 'Lucilene', email: 'lucilene@planetamotores.com.br', senhaHash: 'x' }
  await db.insert(usuarios).values(dados)
  await expect(db.insert(usuarios).values(dados)).rejects.toThrow()
})

test('apagar o usuário apaga suas sessões', async () => {
  const [usuario] = await db
    .insert(usuarios)
    .values({ nome: 'Lucilene', email: 'l@p.com', senhaHash: 'x' })
    .returning()
  await db.insert(sessoes).values({
    id: 'hash-de-token',
    usuarioId: usuario.id,
    expiraEm: new Date(Date.now() + 3_600_000),
  })

  await db.delete(usuarios).where(eq(usuarios.id, usuario.id))

  expect(await db.select().from(sessoes)).toHaveLength(0)
})

test('configuracoes aceita uma linha e traz padrões preenchidos', async () => {
  const [linha] = await db.insert(configuracoes).values({ id: 1 }).returning()

  expect(linha.empresaNome).toBe('Planeta Motores')
  expect(linha.orcamentoValidadeDias).toBe(15)
  expect(linha.modeloMsgPronto).toContain('{{cliente}}')
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run testes/integracao/schema-base.test.ts`
Expected: FAIL — `usuarios` não é exportado por `src/db/schema`.

- [ ] **Step 3: Escrever o schema de acesso**

`src/db/schema/usuarios.ts`:

```ts
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  senhaHash: text('senha_hash').notNull(),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * `id` guarda o SHA-256 do token, não o token. Assim um vazamento do banco
 * não entrega sessão viva a ninguém.
 */
export const sessoes = pgTable('sessoes', {
  id: text('id').primaryKey(),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 4: Escrever o schema de configurações**

`src/db/schema/configuracoes.ts`:

```ts
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Tabela de linha única: `id` é sempre 1. O módulo de configurações é o único
 * a escrever aqui e garante essa invariante.
 */
export const configuracoes = pgTable('configuracoes', {
  id: integer('id').primaryKey(),
  empresaNome: text('empresa_nome').notNull().default('Planeta Motores'),
  empresaCnpj: text('empresa_cnpj'),
  empresaTelefone: text('empresa_telefone'),
  empresaEndereco: text('empresa_endereco'),
  logoCaminho: text('logo_caminho'),
  orcamentoValidadeDias: integer('orcamento_validade_dias').notNull().default(15),
  modeloMsgOrcamento: text('modelo_msg_orcamento')
    .notNull()
    .default(
      'Olá {{cliente}}, o orçamento da OS {{numero}} ({{equipamento}}) ficou em {{total}}. Posso seguir com o serviço?',
    ),
  modeloMsgPronto: text('modelo_msg_pronto')
    .notNull()
    .default(
      'Olá {{cliente}}, o serviço da OS {{numero}} ({{equipamento}}) está pronto para retirada. Valor: {{total}}.',
    ),
  modeloMsgCobranca: text('modelo_msg_cobranca')
    .notNull()
    .default(
      'Olá {{cliente}}, consta em aberto o valor de {{saldo}} referente à OS {{numero}}. Podemos combinar o pagamento?',
    ),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
})
```

`src/db/schema/index.ts`:

```ts
export * from './usuarios'
export * from './configuracoes'
```

- [ ] **Step 5: Gerar e aplicar a migração**

```bash
npm run banco:gerar
npm run banco:aplicar
```

Expected: arquivo criado em `drizzle/` e migração aplicada no banco de desenvolvimento.

- [ ] **Step 6: Criar o apoio de teste ao banco**

`testes/ajuda/setup-global.ts` aplica as migrações no banco de teste antes de tudo:

```ts
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

export default async function setupGlobal() {
  const cliente = postgres(process.env.DATABASE_URL!, { max: 1 })
  await migrate(drizzle(cliente), { migrationsFolder: './drizzle' })
  await cliente.end()
}
```

`testes/ajuda/banco.ts`:

```ts
import { sql } from 'drizzle-orm'
import { db } from '../../src/db'

/**
 * Esvazia todas as tabelas de domínio preservando o esquema. Descobre a lista
 * no catálogo do Postgres para que tabela nova entre sozinha, sem manutenção
 * desta função.
 */
export async function limparBanco(): Promise<void> {
  const linhas = await db.execute<{ nome: string }>(sql`
    select tablename as nome
    from pg_tables
    where schemaname = 'public'
      and tablename <> '__drizzle_migrations'
  `)
  if (linhas.length === 0) return
  const lista = linhas.map((l) => `"${l.nome}"`).join(', ')
  await db.execute(sql.raw(`truncate table ${lista} restart identity cascade`))
}
```

Em `vitest.config.ts`, dentro de `test`, acrescentar:

```ts
    globalSetup: ['./testes/ajuda/setup-global.ts'],
```

- [ ] **Step 7: Rodar e confirmar que passa**

Run: `npx vitest run testes/integracao/schema-base.test.ts`
Expected: PASS, 4 testes.

- [ ] **Step 8: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS em todos os arquivos.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Adiciona schema de usuarios, sessoes e configuracoes com apoio de teste ao banco"
```

---

### Task 5: Senha e sessão

Entrega: hash de senha com Argon2id e sessão persistida, ambos testados contra o banco. Nenhuma dependência de HTTP ainda — isso mantém a regra testável sem simular `cookies()`.

**Files:**
- Create: `src/modulos/auth/senha.ts`, `src/modulos/auth/sessao.ts`
- Test: `testes/integracao/auth-sessao.test.ts`, `testes/unidade/senha.test.ts`

**Interfaces:**
- Consumes: `db`, tabelas `usuarios` e `sessoes`.
- Produces:
  - `gerarHash(senha: string): Promise<string>`
  - `verificarSenha(senha: string, hash: string): Promise<boolean>`
  - `type UsuarioSessao = { id: string; nome: string; email: string }`
  - `DURACAO_SESSAO_MS: number`
  - `criarSessao(usuarioId: string): Promise<string>` — devolve o token em claro, uma única vez
  - `buscarUsuarioPorToken(token: string): Promise<UsuarioSessao | null>`
  - `encerrarSessao(token: string): Promise<void>`

- [ ] **Step 1: Instalar o Argon2**

```bash
npm install @node-rs/argon2
```

- [ ] **Step 2: Escrever o teste de senha que falha**

`testes/unidade/senha.test.ts`:

```ts
import { expect, test } from 'vitest'
import { gerarHash, verificarSenha } from '../../src/modulos/auth/senha'

test('o hash não contém a senha em claro', async () => {
  const hash = await gerarHash('motor2tempos')
  expect(hash).not.toContain('motor2tempos')
  expect(hash.startsWith('$argon2id$')).toBe(true)
})

test('duas chamadas geram hashes diferentes para a mesma senha', async () => {
  expect(await gerarHash('motor2tempos')).not.toBe(await gerarHash('motor2tempos'))
})

test('confere a senha correta e recusa a errada', async () => {
  const hash = await gerarHash('motor2tempos')
  expect(await verificarSenha('motor2tempos', hash)).toBe(true)
  expect(await verificarSenha('motor4tempos', hash)).toBe(false)
})

test('hash corrompido devolve falso em vez de estourar', async () => {
  expect(await verificarSenha('motor2tempos', 'não é um hash')).toBe(false)
})
```

- [ ] **Step 3: Rodar e confirmar a falha**

Run: `npx vitest run testes/unidade/senha.test.ts`
Expected: FAIL — não resolve `src/modulos/auth/senha`.

- [ ] **Step 4: Implementar `senha.ts`**

```ts
import { hash, verify } from '@node-rs/argon2'

export function gerarHash(senha: string): Promise<string> {
  return hash(senha)
}

export async function verificarSenha(senha: string, valorHash: string): Promise<boolean> {
  try {
    return await verify(valorHash, senha)
  } catch {
    // Hash malformado no banco não é motivo para derrubar o login: é senha errada.
    return false
  }
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx vitest run testes/unidade/senha.test.ts`
Expected: PASS, 4 testes.

- [ ] **Step 6: Escrever o teste de sessão que falha**

`testes/integracao/auth-sessao.test.ts`:

```ts
import { eq } from 'drizzle-orm'
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { sessoes, usuarios } from '../../src/db/schema'
import {
  buscarUsuarioPorToken,
  criarSessao,
  encerrarSessao,
} from '../../src/modulos/auth/sessao'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

async function criarUsuario(ativo = true) {
  const [usuario] = await db
    .insert(usuarios)
    .values({
      nome: 'Lucilene',
      email: 'lucilene@planetamotores.com.br',
      senhaHash: 'x',
      ativo,
    })
    .returning()
  return usuario
}

test('a sessão criada resolve para o usuário', async () => {
  const usuario = await criarUsuario()
  const token = await criarSessao(usuario.id)

  const encontrado = await buscarUsuarioPorToken(token)
  expect(encontrado).toEqual({
    id: usuario.id,
    nome: 'Lucilene',
    email: 'lucilene@planetamotores.com.br',
  })
})

test('o token não é gravado em claro no banco', async () => {
  const usuario = await criarUsuario()
  const token = await criarSessao(usuario.id)

  const [linha] = await db.select().from(sessoes)
  expect(linha.id).not.toBe(token)
  expect(linha.id).toHaveLength(64)
})

test('token desconhecido não resolve', async () => {
  expect(await buscarUsuarioPorToken('inventado')).toBeNull()
})

test('sessão expirada não resolve', async () => {
  const usuario = await criarUsuario()
  const token = await criarSessao(usuario.id)
  await db
    .update(sessoes)
    .set({ expiraEm: new Date(Date.now() - 1000) })
    .where(eq(sessoes.usuarioId, usuario.id))

  expect(await buscarUsuarioPorToken(token)).toBeNull()
})

test('usuário inativo não resolve, mesmo com sessão válida', async () => {
  const usuario = await criarUsuario(false)
  const token = await criarSessao(usuario.id)

  expect(await buscarUsuarioPorToken(token)).toBeNull()
})

test('encerrar a sessão invalida o token', async () => {
  const usuario = await criarUsuario()
  const token = await criarSessao(usuario.id)

  await encerrarSessao(token)

  expect(await buscarUsuarioPorToken(token)).toBeNull()
  expect(await db.select().from(sessoes)).toHaveLength(0)
})
```

- [ ] **Step 7: Rodar e confirmar a falha**

Run: `npx vitest run testes/integracao/auth-sessao.test.ts`
Expected: FAIL — não resolve `src/modulos/auth/sessao`.

- [ ] **Step 8: Implementar `sessao.ts`**

```ts
import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import { db } from '@/db'
import { sessoes, usuarios } from '@/db/schema'

export type UsuarioSessao = { id: string; nome: string; email: string }

export const DURACAO_SESSAO_MS = 30 * 24 * 60 * 60 * 1000

function hashDoToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Cria a sessão e devolve o token em claro — que só existe aqui e no cookie. */
export async function criarSessao(usuarioId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  await db.insert(sessoes).values({
    id: hashDoToken(token),
    usuarioId,
    expiraEm: new Date(Date.now() + DURACAO_SESSAO_MS),
  })
  return token
}

export async function buscarUsuarioPorToken(token: string): Promise<UsuarioSessao | null> {
  const [linha] = await db
    .select({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email })
    .from(sessoes)
    .innerJoin(usuarios, eq(usuarios.id, sessoes.usuarioId))
    .where(
      and(
        eq(sessoes.id, hashDoToken(token)),
        gt(sessoes.expiraEm, new Date()),
        eq(usuarios.ativo, true),
      ),
    )
    .limit(1)

  return linha ?? null
}

export async function encerrarSessao(token: string): Promise<void> {
  await db.delete(sessoes).where(eq(sessoes.id, hashDoToken(token)))
}
```

- [ ] **Step 9: Rodar e confirmar que passa**

Run: `npx vitest run testes/integracao/auth-sessao.test.ts`
Expected: PASS, 6 testes.

- [ ] **Step 10: Commit**

```bash
git add src/modulos/auth testes
git commit -m "Adiciona hash de senha com Argon2id e sessao persistida"
```

---

### Task 6: Login, logout e guarda de rota

Entrega: a Lucilene entra no sistema. Inclui o script que cria o usuário, já que não existe cadastro público.

**Files:**
- Create: `src/modulos/auth/autenticacao.ts`, `src/modulos/auth/esquemas.ts`, `src/modulos/auth/acoes.ts`, `src/modulos/auth/guarda.ts`, `scripts/criar-usuario.ts`, `src/app/(auth)/entrar/page.tsx`, `src/app/(auth)/entrar/formulario.tsx`, `playwright.config.ts`, `testes/e2e/login.spec.ts`
- Test: `testes/integracao/auth-autenticacao.test.ts`, `testes/e2e/login.spec.ts`

**Interfaces:**
- Consumes: `verificarSenha`, `criarSessao`, `buscarUsuarioPorToken`, `encerrarSessao`, `DURACAO_SESSAO_MS`, `Resultado`, `sucesso`, `falha`, `falhaDeValidacao`, `textoObrigatorio`.
- Produces:
  - `autenticar(email: string, senha: string): Promise<Resultado<string>>` — devolve o token
  - `COOKIE_SESSAO: 'pm_sessao'`
  - `entrar(anterior: Resultado<null> | null, formulario: FormData): Promise<Resultado<null>>` — Server Action
  - `sair(): Promise<void>` — Server Action
  - `usuarioAtual(): Promise<UsuarioSessao | null>`
  - `exigirUsuario(): Promise<UsuarioSessao>` — redireciona para `/entrar` quando não há sessão

- [ ] **Step 1: Escrever o teste de autenticação que falha**

`testes/integracao/auth-autenticacao.test.ts`:

```ts
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { usuarios } from '../../src/db/schema'
import { autenticar } from '../../src/modulos/auth/autenticacao'
import { gerarHash } from '../../src/modulos/auth/senha'
import { buscarUsuarioPorToken } from '../../src/modulos/auth/sessao'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

async function criarLucilene(ativo = true) {
  await db.insert(usuarios).values({
    nome: 'Lucilene',
    email: 'lucilene@planetamotores.com.br',
    senhaHash: await gerarHash('motor2tempos'),
    ativo,
  })
}

test('autentica com credenciais corretas e abre sessão', async () => {
  await criarLucilene()

  const r = await autenticar('lucilene@planetamotores.com.br', 'motor2tempos')

  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect(await buscarUsuarioPorToken(r.dados)).not.toBeNull()
})

test('aceita e-mail com maiúsculas e espaços em volta', async () => {
  await criarLucilene()

  const r = await autenticar('  LUCILENE@planetamotores.com.br ', 'motor2tempos')

  expect(r.ok).toBe(true)
})

test('senha errada devolve a mesma mensagem que e-mail inexistente', async () => {
  await criarLucilene()

  const senhaErrada = await autenticar('lucilene@planetamotores.com.br', 'errada')
  const semUsuario = await autenticar('ninguem@planetamotores.com.br', 'motor2tempos')

  expect(senhaErrada.ok).toBe(false)
  expect(semUsuario.ok).toBe(false)
  if (senhaErrada.ok || semUsuario.ok) return
  // Mensagem única de propósito: distinguir os dois casos entrega quais
  // e-mails existem a quem estiver tentando adivinhar.
  expect(senhaErrada.erro).toBe('E-mail ou senha inválidos.')
  expect(semUsuario.erro).toBe(senhaErrada.erro)
})

test('usuário inativo não autentica', async () => {
  await criarLucilene(false)

  const r = await autenticar('lucilene@planetamotores.com.br', 'motor2tempos')

  expect(r.ok).toBe(false)
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run testes/integracao/auth-autenticacao.test.ts`
Expected: FAIL — não resolve `src/modulos/auth/autenticacao`.

- [ ] **Step 3: Implementar `autenticacao.ts`**

```ts
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { usuarios } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import { verificarSenha } from './senha'
import { criarSessao } from './sessao'

const CREDENCIAL_INVALIDA = 'E-mail ou senha inválidos.'

/** Confere credenciais e abre a sessão. Devolve o token da sessão criada. */
export async function autenticar(
  email: string,
  senha: string,
): Promise<Resultado<string>> {
  const [usuario] = await db
    .select()
    .from(usuarios)
    .where(and(eq(usuarios.email, email.trim().toLowerCase()), eq(usuarios.ativo, true)))
    .limit(1)

  if (!usuario) return falha(CREDENCIAL_INVALIDA)
  if (!(await verificarSenha(senha, usuario.senhaHash))) return falha(CREDENCIAL_INVALIDA)

  return sucesso(await criarSessao(usuario.id))
}
```

O e-mail é gravado já em minúsculas pelo script do passo 5, por isso a comparação direta funciona.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run testes/integracao/auth-autenticacao.test.ts`
Expected: PASS, 4 testes.

- [ ] **Step 5: Criar o script de usuário**

`scripts/criar-usuario.ts`:

```ts
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db } from '../src/db'
import { usuarios } from '../src/db/schema'
import { gerarHash } from '../src/modulos/auth/senha'

const [nome, emailBruto, senha] = process.argv.slice(2)

if (!nome || !emailBruto || !senha) {
  console.error('Uso: npm run usuario -- "Nome" email@dominio senha')
  process.exit(1)
}

const email = emailBruto.trim().toLowerCase()
const senhaHash = await gerarHash(senha)

const [existente] = await db.select().from(usuarios).where(eq(usuarios.email, email))

if (existente) {
  await db.update(usuarios).set({ senhaHash, ativo: true }).where(eq(usuarios.id, existente.id))
  console.log(`Senha de ${email} atualizada.`)
} else {
  await db.insert(usuarios).values({ nome, email, senhaHash })
  console.log(`Usuário ${email} criado.`)
}

process.exit(0)
```

Em `package.json`, acrescentar ao `scripts`: `"usuario": "tsx scripts/criar-usuario.ts"`.

Run: `npm run usuario -- "Lucilene" lucilene@planetamotores.com.br motor2tempos`
Expected: `Usuário lucilene@planetamotores.com.br criado.`

- [ ] **Step 6: Implementar a guarda e as Server Actions**

`src/modulos/auth/guarda.ts`:

```ts
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { buscarUsuarioPorToken, type UsuarioSessao } from './sessao'

export const COOKIE_SESSAO = 'pm_sessao'

export async function usuarioAtual(): Promise<UsuarioSessao | null> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value
  if (!token) return null
  return buscarUsuarioPorToken(token)
}

/** Para uso em layout e página protegida: garante sessão ou manda para o login. */
export async function exigirUsuario(): Promise<UsuarioSessao> {
  const usuario = await usuarioAtual()
  if (!usuario) redirect('/entrar')
  return usuario
}
```

`src/modulos/auth/esquemas.ts`:

```ts
import { z } from 'zod'
import { textoObrigatorio } from '@/lib/validacao'

export const entradaLogin = z.object({
  email: textoObrigatorio('E-mail').email('Informe um e-mail válido'),
  senha: textoObrigatorio('Senha'),
})
```

`src/modulos/auth/acoes.ts`:

```ts
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { falhaDeValidacao, type Resultado } from '@/lib/resultado'
import { autenticar } from './autenticacao'
import { COOKIE_SESSAO } from './guarda'
import { DURACAO_SESSAO_MS, encerrarSessao } from './sessao'

export async function entrar(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  const analise = entradaLoginDoFormulario(formulario)
  if (!analise.ok) return analise

  const autenticacao = await autenticar(analise.dados.email, analise.dados.senha)
  if (!autenticacao.ok) return autenticacao

  ;(await cookies()).set(COOKIE_SESSAO, autenticacao.dados, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DURACAO_SESSAO_MS / 1000,
  })

  redirect('/clientes')
}

function entradaLoginDoFormulario(
  formulario: FormData,
): Resultado<{ email: string; senha: string }> {
  const analise = entradaLogin.safeParse({
    email: String(formulario.get('email') ?? ''),
    senha: String(formulario.get('senha') ?? ''),
  })
  return analise.success
    ? { ok: true, dados: analise.data }
    : falhaDeValidacao(analise.error)
}

export async function sair(): Promise<void> {
  const jarra = await cookies()
  const token = jarra.get(COOKIE_SESSAO)?.value
  if (token) await encerrarSessao(token)
  jarra.delete(COOKIE_SESSAO)
  redirect('/entrar')
}
```

Acrescentar no topo do arquivo o import `import { entradaLogin } from './esquemas'`.

Nota: `redirect()` funciona lançando uma exceção interna do Next; por isso ele vem depois de gravar o cookie e o tipo de retorno declarado nunca é alcançado no caminho de sucesso.

- [ ] **Step 7: Criar a tela de login**

`src/app/(auth)/entrar/formulario.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { entrar } from '@/modulos/auth/acoes'

export function FormularioLogin() {
  const [resultado, acao, pendente] = useActionState(entrar, null)

  return (
    <form action={acao} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-xl font-semibold">Planeta Motores</h1>

      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="rounded border px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Senha
        <input
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="rounded border px-3 py-2"
        />
      </label>

      {resultado && !resultado.ok && (
        <p role="alert" className="text-sm text-red-600">
          {resultado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-60"
      >
        {pendente ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
```

`src/app/(auth)/entrar/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { usuarioAtual } from '@/modulos/auth/guarda'
import { FormularioLogin } from './formulario'

export default async function PaginaEntrar() {
  if (await usuarioAtual()) redirect('/clientes')

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <FormularioLogin />
    </main>
  )
}
```

- [ ] **Step 8: Configurar o Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

`playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

export default defineConfig({
  testDir: './testes/e2e',
  use: { baseURL: 'http://localhost:3100' },
  webServer: {
    command: 'npm run dev -- --port 3100',
    url: 'http://localhost:3100/entrar',
    reuseExistingServer: false,
    env: { DATABASE_URL: process.env.DATABASE_URL! },
  },
})
```

O e2e aponta para o banco de teste e para uma porta própria, para não colidir com o `npm run dev` que você deixa aberto.

Em `package.json`, acrescentar ao `scripts`: `"teste:e2e": "playwright test"`.

- [ ] **Step 9: Escrever o teste ponta a ponta de login**

`testes/e2e/login.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { db } from '../../src/db'
import { usuarios } from '../../src/db/schema'
import { gerarHash } from '../../src/modulos/auth/senha'
import { limparBanco } from '../ajuda/banco'

test.beforeEach(async () => {
  await limparBanco()
  await db.insert(usuarios).values({
    nome: 'Lucilene',
    email: 'lucilene@planetamotores.com.br',
    senhaHash: await gerarHash('motor2tempos'),
  })
})

test('rota protegida manda para o login', async ({ page }) => {
  await page.goto('/clientes')
  await expect(page).toHaveURL(/\/entrar$/)
})

test('entra com credenciais corretas', async ({ page }) => {
  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill('lucilene@planetamotores.com.br')
  await page.getByLabel('Senha').fill('motor2tempos')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page).toHaveURL(/\/clientes$/)
})

test('mostra erro e permanece na tela com senha errada', async ({ page }) => {
  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill('lucilene@planetamotores.com.br')
  await page.getByLabel('Senha').fill('errada')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos.')
  await expect(page).toHaveURL(/\/entrar$/)
})
```

Estes três testes só passam depois da Task 10, que cria a rota `/clientes` e a guarda no layout. É esperado: escreva-os agora, veja falhar, e a Task 10 os torna verdes. No Plano 2, quando a lista de ordens de serviço passar a ser a tela inicial do spec, o destino do login muda de `/clientes` para `/ordens-servico` e estes testes acompanham.

- [ ] **Step 10: Rodar e observar a falha esperada**

Run: `npx playwright test testes/e2e/login.spec.ts`
Expected: FAIL — `/clientes` responde 404.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "Adiciona autenticacao, tela de login, guarda de rota e script de usuario"
```

---

### Task 7: Schema de clientes e equipamentos

Entrega: as duas tabelas migradas, com as restrições que impedem cadastro duplicado e equipamento órfão.

**Files:**
- Create: `src/db/schema/clientes.ts`
- Modify: `src/db/schema/index.ts` (reexportar)
- Test: `testes/integracao/schema-clientes.test.ts`

**Interfaces:**
- Consumes: `db`.
- Produces: tabelas `clientes` e `equipamentos`; enums `tipoPessoa`, `tipoMotor`, `aplicacaoEquipamento`.

**Nota de escopo:** o índice único parcial sobre `documento` é uma adição ao spec, que não pedia unicidade. Ela entra porque cliente cadastrado duas vezes é justamente o defeito do controle em papel que o sistema existe para corrigir, e o custo é uma linha. `documento` nulo continua permitido em qualquer quantidade.

- [ ] **Step 1: Escrever o teste que falha**

`testes/integracao/schema-clientes.test.ts`:

```ts
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { clientes, equipamentos } from '../../src/db/schema'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

async function inserirCliente(extra: Record<string, unknown> = {}) {
  const [cliente] = await db
    .insert(clientes)
    .values({ nome: 'Marcos Andrade', ...extra })
    .returning()
  return cliente
}

test('cliente nasce ativo, como pessoa física, com datas preenchidas', async () => {
  const cliente = await inserirCliente()

  expect(cliente.tipoPessoa).toBe('fisica')
  expect(cliente.ativo).toBe(true)
  expect(cliente.criadoEm).toBeInstanceOf(Date)
  expect(cliente.atualizadoEm).toBeInstanceOf(Date)
})

test('o mesmo documento não pode ser cadastrado duas vezes', async () => {
  await inserirCliente({ documento: '12345678900' })
  await expect(inserirCliente({ documento: '12345678900' })).rejects.toThrow()
})

test('vários clientes podem ficar sem documento', async () => {
  await inserirCliente({ nome: 'Sem documento 1' })
  await inserirCliente({ nome: 'Sem documento 2' })

  expect(await db.select().from(clientes)).toHaveLength(2)
})

test('equipamento exige cliente existente', async () => {
  await expect(
    db.insert(equipamentos).values({
      clienteId: '00000000-0000-0000-0000-000000000000',
      tipoMotor: '2T',
      aplicacao: 'rocadeira',
    }),
  ).rejects.toThrow()
})

test('apagar o cliente apaga seus equipamentos', async () => {
  const cliente = await inserirCliente()
  await db
    .insert(equipamentos)
    .values({ clienteId: cliente.id, tipoMotor: '2T', aplicacao: 'rocadeira' })

  await db.delete(clientes)

  expect(await db.select().from(equipamentos)).toHaveLength(0)
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run testes/integracao/schema-clientes.test.ts`
Expected: FAIL — `clientes` não é exportado por `src/db/schema`.

- [ ] **Step 3: Escrever o schema**

`src/db/schema/clientes.ts`:

```ts
import { sql } from 'drizzle-orm'
import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const tipoPessoa = pgEnum('tipo_pessoa', ['fisica', 'juridica'])

export const tipoMotor = pgEnum('tipo_motor', ['2T', '4T'])

export const aplicacaoEquipamento = pgEnum('aplicacao_equipamento', [
  'rocadeira',
  'motosserra',
  'motobomba',
  'gerador',
  'soprador',
  'outro',
])

export const clientes = pgTable(
  'clientes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull(),
    tipoPessoa: tipoPessoa('tipo_pessoa').notNull().default('fisica'),
    documento: text('documento'),
    telefone: text('telefone'),
    email: text('email'),
    logradouro: text('logradouro'),
    numero: text('numero'),
    complemento: text('complemento'),
    bairro: text('bairro'),
    cidade: text('cidade'),
    uf: text('uf'),
    cep: text('cep'),
    observacoes: text('observacoes'),
    ativo: boolean('ativo').notNull().default(true),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabela) => [
    // Parcial: documento nulo não colide com documento nulo.
    uniqueIndex('clientes_documento_unico')
      .on(tabela.documento)
      .where(sql`${tabela.documento} is not null`),
  ],
)

export const equipamentos = pgTable('equipamentos', {
  id: uuid('id').primaryKey().defaultRandom(),
  clienteId: uuid('cliente_id')
    .notNull()
    .references(() => clientes.id, { onDelete: 'cascade' }),
  tipoMotor: tipoMotor('tipo_motor').notNull(),
  aplicacao: aplicacaoEquipamento('aplicacao').notNull(),
  marca: text('marca'),
  modelo: text('modelo'),
  numeroSerie: text('numero_serie'),
  observacoes: text('observacoes'),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})
```

Acrescentar a `src/db/schema/index.ts`:

```ts
export * from './clientes'
```

- [ ] **Step 4: Gerar e aplicar a migração**

```bash
npm run banco:gerar
npm run banco:aplicar
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx vitest run testes/integracao/schema-clientes.test.ts`
Expected: PASS, 5 testes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Adiciona schema de clientes e equipamentos"
```

---

### Task 8: Clientes — validação, consultas e operações

Entrega: a regra de cliente completa e testada, sem tela ainda.

**Files:**
- Create: `src/modulos/clientes/esquemas.ts`, `src/modulos/clientes/consultas.ts`, `src/modulos/clientes/operacoes.ts`
- Test: `testes/integracao/clientes.test.ts`

**Interfaces:**
- Consumes: `db`, `clientes`, `equipamentos`, `Resultado`, `sucesso`, `falha`, `textoObrigatorio`, `documentoOpcional`, `telefoneOpcional`, `cepOpcional`.
- Produces:
  - `entradaCliente` (esquema Zod) e `type EntradaCliente = z.infer<typeof entradaCliente>`
  - `type ClienteResumo = { id: string; nome: string; telefone: string | null; cidade: string | null; ativo: boolean; quantidadeEquipamentos: number }`
  - `listarClientes(filtro?: { busca?: string; incluirInativos?: boolean }): Promise<ClienteResumo[]>`
  - `obterCliente(id: string): Promise<typeof clientes.$inferSelect | null>`
  - `criarCliente(entrada: EntradaCliente): Promise<Resultado<{ id: string }>>`
  - `atualizarCliente(id: string, entrada: EntradaCliente): Promise<Resultado<null>>`
  - `definirAtivoCliente(id: string, ativo: boolean): Promise<Resultado<null>>`

- [ ] **Step 1: Escrever o teste que falha**

`testes/integracao/clientes.test.ts`:

```ts
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { equipamentos } from '../../src/db/schema'
import { listarClientes, obterCliente } from '../../src/modulos/clientes/consultas'
import {
  atualizarCliente,
  criarCliente,
  definirAtivoCliente,
} from '../../src/modulos/clientes/operacoes'
import { entradaCliente } from '../../src/modulos/clientes/esquemas'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

const base = {
  nome: 'Marcos Andrade',
  tipoPessoa: 'fisica' as const,
  documento: '',
  telefone: '',
  email: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  cep: '',
  observacoes: '',
}

function entrada(extra: Partial<typeof base> = {}) {
  return entradaCliente.parse({ ...base, ...extra })
}

test('cria o cliente e devolve o identificador', async () => {
  const r = await criarCliente(entrada({ telefone: '(11) 98765-4321' }))

  expect(r.ok).toBe(true)
  if (!r.ok) return
  const cliente = await obterCliente(r.dados.id)
  expect(cliente?.nome).toBe('Marcos Andrade')
  expect(cliente?.telefone).toBe('11987654321')
})

test('recusa documento já cadastrado com mensagem legível', async () => {
  await criarCliente(entrada({ documento: '123.456.789-00' }))

  const r = await criarCliente(entrada({ nome: 'Outro', documento: '12345678900' }))

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Já existe cliente cadastrado com esse CPF/CNPJ.')
})

test('atualiza o cliente e move a data de atualização', async () => {
  const criado = await criarCliente(entrada())
  if (!criado.ok) throw new Error('criação falhou')
  const antes = await obterCliente(criado.dados.id)

  const r = await atualizarCliente(criado.dados.id, entrada({ nome: 'Marcos A. Silva' }))

  expect(r.ok).toBe(true)
  const depois = await obterCliente(criado.dados.id)
  expect(depois?.nome).toBe('Marcos A. Silva')
  expect(depois!.atualizadoEm.getTime()).toBeGreaterThanOrEqual(antes!.atualizadoEm.getTime())
})

test('atualizar cliente inexistente falha sem estourar', async () => {
  const r = await atualizarCliente('00000000-0000-0000-0000-000000000000', entrada())

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Cliente não encontrado.')
})

test('lista em ordem alfabética e conta os equipamentos', async () => {
  const zeca = await criarCliente(entrada({ nome: 'Zeca Ferreira', documento: '1' .repeat(11) }))
  const ana = await criarCliente(entrada({ nome: 'Ana Souza' }))
  if (!zeca.ok || !ana.ok) throw new Error('criação falhou')
  await db.insert(equipamentos).values([
    { clienteId: zeca.dados.id, tipoMotor: '2T', aplicacao: 'rocadeira' },
    { clienteId: zeca.dados.id, tipoMotor: '4T', aplicacao: 'motobomba' },
  ])

  const lista = await listarClientes()

  expect(lista.map((c) => c.nome)).toEqual(['Ana Souza', 'Zeca Ferreira'])
  expect(lista[0].quantidadeEquipamentos).toBe(0)
  expect(lista[1].quantidadeEquipamentos).toBe(2)
})

test('busca por parte do nome, ignorando caixa', async () => {
  await criarCliente(entrada({ nome: 'Verde Jardins Paisagismo' }))
  await criarCliente(entrada({ nome: 'Lava-jato Cruz', documento: '2'.repeat(11) }))

  const lista = await listarClientes({ busca: 'jardins' })

  expect(lista.map((c) => c.nome)).toEqual(['Verde Jardins Paisagismo'])
})

test('busca por documento aceita pontuação digitada', async () => {
  await criarCliente(entrada({ documento: '12.345.678/0001-95', tipoPessoa: 'juridica' }))

  const lista = await listarClientes({ busca: '12.345.678' })

  expect(lista).toHaveLength(1)
})

test('inativo fica fora da lista, salvo quando pedido', async () => {
  const criado = await criarCliente(entrada())
  if (!criado.ok) throw new Error('criação falhou')

  await definirAtivoCliente(criado.dados.id, false)

  expect(await listarClientes()).toHaveLength(0)
  expect(await listarClientes({ incluirInativos: true })).toHaveLength(1)
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run testes/integracao/clientes.test.ts`
Expected: FAIL — não resolve os três módulos de `clientes`.

- [ ] **Step 3: Implementar `esquemas.ts`**

```ts
import { z } from 'zod'
import {
  cepOpcional,
  documentoOpcional,
  telefoneOpcional,
  textoObrigatorio,
} from '@/lib/validacao'

// `.optional()` é obrigatório aqui: campo opcional que o formulário não envia
// chega como chave ausente, e sem isso o Zod reprova a entrada inteira.
const opcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))

export const entradaCliente = z.object({
  nome: textoObrigatorio('Nome'),
  tipoPessoa: z.enum(['fisica', 'juridica']),
  documento: documentoOpcional,
  telefone: telefoneOpcional,
  email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: 'Informe um e-mail válido',
    })
    .transform((v) => (v ? v.toLowerCase() : null)),
  logradouro: opcional,
  numero: opcional,
  complemento: opcional,
  bairro: opcional,
  cidade: opcional,
  uf: opcional,
  cep: cepOpcional,
  observacoes: opcional,
})

export type EntradaCliente = z.infer<typeof entradaCliente>
```

- [ ] **Step 4: Implementar `operacoes.ts`**

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { clientes } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import type { EntradaCliente } from './esquemas'

const DOCUMENTO_DUPLICADO = 'Já existe cliente cadastrado com esse CPF/CNPJ.'

/**
 * Reconhece a violação do índice único de documento. O Drizzle embrulha o erro
 * do Postgres, então o código e o nome da restrição só aparecem descendo a
 * cadeia de `cause` — casar por texto da mensagem não funciona.
 */
function eDocumentoDuplicado(erro: unknown): boolean {
  const VIOLACAO_DE_UNICIDADE = '23505'
  for (let atual: unknown = erro; atual; atual = (atual as { cause?: unknown }).cause) {
    const candidato = atual as { code?: string; constraint_name?: string }
    if (
      candidato.code === VIOLACAO_DE_UNICIDADE &&
      candidato.constraint_name === 'clientes_documento_unico'
    ) {
      return true
    }
  }
  return false
}

export async function criarCliente(
  entrada: EntradaCliente,
): Promise<Resultado<{ id: string }>> {
  try {
    const [criado] = await db.insert(clientes).values(entrada).returning({ id: clientes.id })
    return sucesso({ id: criado.id })
  } catch (erro) {
    if (eDocumentoDuplicado(erro)) return falha(DOCUMENTO_DUPLICADO)
    throw erro
  }
}

export async function atualizarCliente(
  id: string,
  entrada: EntradaCliente,
): Promise<Resultado<null>> {
  try {
    const alterados = await db
      .update(clientes)
      .set({ ...entrada, atualizadoEm: new Date() })
      .where(eq(clientes.id, id))
      .returning({ id: clientes.id })

    if (alterados.length === 0) return falha('Cliente não encontrado.')
    return sucesso(null)
  } catch (erro) {
    if (eDocumentoDuplicado(erro)) return falha(DOCUMENTO_DUPLICADO)
    throw erro
  }
}

export async function definirAtivoCliente(
  id: string,
  ativo: boolean,
): Promise<Resultado<null>> {
  const alterados = await db
    .update(clientes)
    .set({ ativo, atualizadoEm: new Date() })
    .where(eq(clientes.id, id))
    .returning({ id: clientes.id })

  if (alterados.length === 0) return falha('Cliente não encontrado.')
  return sucesso(null)
}
```

- [ ] **Step 5: Implementar `consultas.ts`**

```ts
import { and, asc, count, eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { clientes, equipamentos } from '@/db/schema'
import { apenasDigitos } from '@/lib/validacao'

export type ClienteResumo = {
  id: string
  nome: string
  telefone: string | null
  cidade: string | null
  ativo: boolean
  quantidadeEquipamentos: number
}

export async function listarClientes(
  filtro: { busca?: string; incluirInativos?: boolean } = {},
): Promise<ClienteResumo[]> {
  const condicoes = []
  if (!filtro.incluirInativos) condicoes.push(eq(clientes.ativo, true))

  const busca = filtro.busca?.trim()
  if (busca) {
    const digitos = apenasDigitos(busca)
    const porNome = ilike(clientes.nome, `%${busca}%`)
    // Compara documento por dígitos: o usuário digita com pontuação, o banco guarda sem.
    condicoes.push(
      digitos ? or(porNome, ilike(clientes.documento, `%${digitos}%`))! : porNome,
    )
  }

  return db
    .select({
      id: clientes.id,
      nome: clientes.nome,
      telefone: clientes.telefone,
      cidade: clientes.cidade,
      ativo: clientes.ativo,
      quantidadeEquipamentos: sql<number>`count(${equipamentos.id})::int`,
    })
    .from(clientes)
    .leftJoin(equipamentos, eq(equipamentos.clienteId, clientes.id))
    .where(condicoes.length ? and(...condicoes) : undefined)
    .groupBy(clientes.id)
    .orderBy(asc(clientes.nome))
}

export async function obterCliente(id: string) {
  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1)
  return cliente ?? null
}
```

O import de `count` não é usado; remova-o se o lint reclamar.

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `npx vitest run testes/integracao/clientes.test.ts`
Expected: PASS, 8 testes.

- [ ] **Step 7: Commit**

```bash
git add src/modulos/clientes testes/integracao/clientes.test.ts
git commit -m "Adiciona validacao, consultas e operacoes de cliente"
```

---

### Task 9: Equipamentos — validação, consultas, operações e descrição

Entrega: o equipamento sob o cliente, mais a função que o descreve numa linha — usada em toda tela de OS, PDF e mensagem dos planos seguintes.

**Files:**
- Create: `src/modulos/clientes/equipamentos-esquemas.ts`, `src/modulos/clientes/equipamentos-consultas.ts`, `src/modulos/clientes/equipamentos-operacoes.ts`, `src/modulos/clientes/equipamentos-descricao.ts`
- Test: `testes/unidade/equipamentos-descricao.test.ts`, `testes/integracao/equipamentos.test.ts`

**Interfaces:**
- Consumes: `db`, `clientes`, `equipamentos`, `Resultado`, `textoObrigatorio`.
- Produces:
  - `APLICACOES: Record<Aplicacao, string>` e `type Aplicacao = 'rocadeira' | 'motosserra' | 'motobomba' | 'gerador' | 'soprador' | 'outro'`
  - `descreverEquipamento(e: { aplicacao: Aplicacao; marca: string | null; modelo: string | null; tipoMotor: '2T' | '4T' }): string`
  - `entradaEquipamento` e `type EntradaEquipamento`
  - `listarEquipamentosDoCliente(clienteId: string, incluirInativos?: boolean): Promise<EquipamentoComDescricao[]>`
  - `obterEquipamento(id: string): Promise<typeof equipamentos.$inferSelect | null>`
  - `criarEquipamento(entrada: EntradaEquipamento): Promise<Resultado<{ id: string }>>`
  - `atualizarEquipamento(id: string, entrada: EntradaEquipamento): Promise<Resultado<null>>`
  - `definirAtivoEquipamento(id: string, ativo: boolean): Promise<Resultado<null>>`

- [ ] **Step 1: Escrever o teste de descrição que falha**

`testes/unidade/equipamentos-descricao.test.ts`:

```ts
import { expect, test } from 'vitest'
import { descreverEquipamento } from '../../src/modulos/clientes/equipamentos-descricao'

test('descreve aplicação, marca, modelo e tipo de motor', () => {
  expect(
    descreverEquipamento({
      aplicacao: 'rocadeira',
      marca: 'Stihl',
      modelo: 'FS 220',
      tipoMotor: '2T',
    }),
  ).toBe('Roçadeira Stihl FS 220 (2T)')
})

test('omite marca e modelo ausentes sem deixar espaço sobrando', () => {
  expect(
    descreverEquipamento({
      aplicacao: 'motobomba',
      marca: null,
      modelo: null,
      tipoMotor: '4T',
    }),
  ).toBe('Motobomba (4T)')
})

test('funciona com apenas a marca', () => {
  expect(
    descreverEquipamento({
      aplicacao: 'gerador',
      marca: 'Branco',
      modelo: null,
      tipoMotor: '4T',
    }),
  ).toBe('Gerador Branco (4T)')
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run testes/unidade/equipamentos-descricao.test.ts`
Expected: FAIL — não resolve `equipamentos-descricao`.

- [ ] **Step 3: Implementar `equipamentos-descricao.ts`**

```ts
export const APLICACOES = {
  rocadeira: 'Roçadeira',
  motosserra: 'Motosserra',
  motobomba: 'Motobomba',
  gerador: 'Gerador',
  soprador: 'Soprador',
  outro: 'Outro',
} as const

export type Aplicacao = keyof typeof APLICACOES

export type TipoMotor = '2T' | '4T'

/** Uma linha para identificar o equipamento em lista, PDF e mensagem. */
export function descreverEquipamento(equipamento: {
  aplicacao: Aplicacao
  marca: string | null
  modelo: string | null
  tipoMotor: TipoMotor
}): string {
  const partes = [
    APLICACOES[equipamento.aplicacao],
    equipamento.marca,
    equipamento.modelo,
  ].filter((parte): parte is string => Boolean(parte))

  return `${partes.join(' ')} (${equipamento.tipoMotor})`
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run testes/unidade/equipamentos-descricao.test.ts`
Expected: PASS, 3 testes.

- [ ] **Step 5: Escrever o teste de integração que falha**

`testes/integracao/equipamentos.test.ts`:

```ts
import { beforeEach, expect, test } from 'vitest'
import { criarCliente } from '../../src/modulos/clientes/operacoes'
import { entradaCliente } from '../../src/modulos/clientes/esquemas'
import { entradaEquipamento } from '../../src/modulos/clientes/equipamentos-esquemas'
import {
  listarEquipamentosDoCliente,
  obterEquipamento,
} from '../../src/modulos/clientes/equipamentos-consultas'
import {
  atualizarEquipamento,
  criarEquipamento,
  definirAtivoEquipamento,
} from '../../src/modulos/clientes/equipamentos-operacoes'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

async function novoCliente() {
  const r = await criarCliente(
    entradaCliente.parse({
      nome: 'Marcos Andrade',
      tipoPessoa: 'fisica',
      documento: '',
      telefone: '',
      email: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      cep: '',
      observacoes: '',
    }),
  )
  if (!r.ok) throw new Error('criação de cliente falhou')
  return r.dados.id
}

function entrada(clienteId: string, extra: Record<string, unknown> = {}) {
  return entradaEquipamento.parse({
    clienteId,
    tipoMotor: '2T',
    aplicacao: 'rocadeira',
    marca: 'Stihl',
    modelo: 'FS 220',
    numeroSerie: '',
    observacoes: '',
    ...extra,
  })
}

test('cria o equipamento sob o cliente', async () => {
  const clienteId = await novoCliente()

  const r = await criarEquipamento(entrada(clienteId))

  expect(r.ok).toBe(true)
  if (!r.ok) return
  const equipamento = await obterEquipamento(r.dados.id)
  expect(equipamento?.clienteId).toBe(clienteId)
  expect(equipamento?.marca).toBe('Stihl')
})

test('recusa equipamento de cliente inexistente com mensagem legível', async () => {
  const r = await criarEquipamento(entrada('00000000-0000-0000-0000-000000000000'))

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Cliente não encontrado.')
})

test('a lista traz a descrição pronta', async () => {
  const clienteId = await novoCliente()
  await criarEquipamento(entrada(clienteId))

  const lista = await listarEquipamentosDoCliente(clienteId)

  expect(lista).toHaveLength(1)
  expect(lista[0].descricao).toBe('Roçadeira Stihl FS 220 (2T)')
})

test('atualiza o equipamento', async () => {
  const clienteId = await novoCliente()
  const criado = await criarEquipamento(entrada(clienteId))
  if (!criado.ok) throw new Error('criação falhou')

  const r = await atualizarEquipamento(criado.dados.id, entrada(clienteId, { modelo: 'FS 160' }))

  expect(r.ok).toBe(true)
  expect((await obterEquipamento(criado.dados.id))?.modelo).toBe('FS 160')
})

test('atualizar equipamento inexistente falha sem estourar', async () => {
  const clienteId = await novoCliente()

  const r = await atualizarEquipamento(
    '00000000-0000-0000-0000-000000000000',
    entrada(clienteId),
  )

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Equipamento não encontrado.')
})

test('inativo sai da lista, salvo quando pedido', async () => {
  const clienteId = await novoCliente()
  const criado = await criarEquipamento(entrada(clienteId))
  if (!criado.ok) throw new Error('criação falhou')

  await definirAtivoEquipamento(criado.dados.id, false)

  expect(await listarEquipamentosDoCliente(clienteId)).toHaveLength(0)
  expect(await listarEquipamentosDoCliente(clienteId, true)).toHaveLength(1)
})
```

- [ ] **Step 6: Rodar e confirmar a falha**

Run: `npx vitest run testes/integracao/equipamentos.test.ts`
Expected: FAIL — não resolve os módulos de equipamento.

- [ ] **Step 7: Implementar `equipamentos-esquemas.ts`**

```ts
import { z } from 'zod'

// `.optional()` é obrigatório aqui: campo opcional que o formulário não envia
// chega como chave ausente, e sem isso o Zod reprova a entrada inteira.
const opcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))

export const entradaEquipamento = z.object({
  clienteId: z.string().uuid('Selecione o cliente'),
  tipoMotor: z.enum(['2T', '4T']),
  aplicacao: z.enum([
    'rocadeira',
    'motosserra',
    'motobomba',
    'gerador',
    'soprador',
    'outro',
  ]),
  marca: opcional,
  modelo: opcional,
  numeroSerie: opcional,
  observacoes: opcional,
})

export type EntradaEquipamento = z.infer<typeof entradaEquipamento>
```

- [ ] **Step 8: Implementar `equipamentos-operacoes.ts`**

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { clientes, equipamentos } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import type { EntradaEquipamento } from './equipamentos-esquemas'

async function clienteExiste(id: string): Promise<boolean> {
  const [linha] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(eq(clientes.id, id))
    .limit(1)
  return Boolean(linha)
}

export async function criarEquipamento(
  entrada: EntradaEquipamento,
): Promise<Resultado<{ id: string }>> {
  // Checagem explícita em vez de deixar a chave estrangeira estourar: a tela
  // precisa da mensagem, não do erro do Postgres.
  if (!(await clienteExiste(entrada.clienteId))) return falha('Cliente não encontrado.')

  const [criado] = await db
    .insert(equipamentos)
    .values(entrada)
    .returning({ id: equipamentos.id })

  return sucesso({ id: criado.id })
}

export async function atualizarEquipamento(
  id: string,
  entrada: EntradaEquipamento,
): Promise<Resultado<null>> {
  if (!(await clienteExiste(entrada.clienteId))) return falha('Cliente não encontrado.')

  const alterados = await db
    .update(equipamentos)
    .set(entrada)
    .where(eq(equipamentos.id, id))
    .returning({ id: equipamentos.id })

  if (alterados.length === 0) return falha('Equipamento não encontrado.')
  return sucesso(null)
}

export async function definirAtivoEquipamento(
  id: string,
  ativo: boolean,
): Promise<Resultado<null>> {
  const alterados = await db
    .update(equipamentos)
    .set({ ativo })
    .where(eq(equipamentos.id, id))
    .returning({ id: equipamentos.id })

  if (alterados.length === 0) return falha('Equipamento não encontrado.')
  return sucesso(null)
}
```

- [ ] **Step 9: Implementar `equipamentos-consultas.ts`**

```ts
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { equipamentos } from '@/db/schema'
import { descreverEquipamento } from './equipamentos-descricao'

export type EquipamentoComDescricao = typeof equipamentos.$inferSelect & {
  descricao: string
}

export async function listarEquipamentosDoCliente(
  clienteId: string,
  incluirInativos = false,
): Promise<EquipamentoComDescricao[]> {
  const condicoes = [eq(equipamentos.clienteId, clienteId)]
  if (!incluirInativos) condicoes.push(eq(equipamentos.ativo, true))

  const linhas = await db
    .select()
    .from(equipamentos)
    .where(and(...condicoes))
    .orderBy(asc(equipamentos.aplicacao), asc(equipamentos.marca))

  return linhas.map((linha) => ({ ...linha, descricao: descreverEquipamento(linha) }))
}

export async function obterEquipamento(id: string) {
  const [linha] = await db.select().from(equipamentos).where(eq(equipamentos.id, id)).limit(1)
  return linha ?? null
}
```

- [ ] **Step 10: Rodar e confirmar que passa**

Run: `npx vitest run testes/integracao/equipamentos.test.ts`
Expected: PASS, 6 testes.

- [ ] **Step 11: Commit**

```bash
git add src/modulos/clientes testes
git commit -m "Adiciona equipamentos com descricao, consultas e operacoes"
```

---

### Task 10: Casca da aplicação e lista de clientes

Entrega: a Lucilene entra, vê o menu e a lista de clientes com busca. Os três testes de login da Task 6 ficam verdes aqui.

**Files:**
- Create: `src/componentes/botao.tsx`, `src/componentes/campo.tsx`, `src/componentes/mensagem-erro.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/clientes/page.tsx`, `src/app/(app)/clientes/busca.tsx`, `testes/e2e/clientes-lista.spec.ts`
- Modify: `src/app/layout.tsx` (idioma pt-BR), `src/app/page.tsx` (redirecionar para `/clientes`)
- Test: `testes/e2e/login.spec.ts` (já escrito, passa a valer), `testes/e2e/clientes-lista.spec.ts`

**Interfaces:**
- Consumes: `exigirUsuario`, `sair`, `listarClientes`.
- Produces:
  - `Botao({ children, variante?: 'primario' | 'secundario', ...props })`
  - `Campo({ rotulo, nome, erro?, ...props })`, `CampoSelecao({ rotulo, nome, opcoes, erro?, ...props })`, `CampoTexto({ rotulo, nome, erro?, ...props })`
  - `MensagemErro({ children })`
  - rota `/clientes` protegida, com busca por `?busca=`

**Nota de escopo:** o menu lista apenas as rotas que existem — Clientes, Catálogo e Configurações. Ordens de serviço, Estoque, Compras, Financeiro e Painel entram nos Planos 2 e 3, junto com suas telas. Menu apontando para 404 não é entrega parcial, é defeito.

- [ ] **Step 1: Criar os componentes de interface**

`src/componentes/botao.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario'
}

const ESTILOS = {
  primario: 'bg-blue-600 text-white hover:bg-blue-700',
  secundario: 'border border-gray-300 text-gray-800 hover:bg-gray-50',
} as const

export function Botao({ variante = 'primario', className = '', ...props }: Props) {
  return (
    <button
      {...props}
      className={`rounded px-3 py-2 text-sm disabled:opacity-60 ${ESTILOS[variante]} ${className}`}
    />
  )
}
```

`src/componentes/mensagem-erro.tsx`:

```tsx
export function MensagemErro({ children }: { children?: string }) {
  if (!children) return null
  return (
    <p role="alert" className="text-sm text-red-600">
      {children}
    </p>
  )
}
```

`src/componentes/campo.tsx`:

```tsx
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const BORDA = 'rounded border border-gray-300 px-3 py-2 text-sm'

type Base = { rotulo: string; nome: string; erro?: string }

function Envelope({ rotulo, erro, children }: Base & { children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-700">{rotulo}</span>
      {children}
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </label>
  )
}

export function Campo({
  rotulo,
  nome,
  erro,
  ...props
}: Base & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Envelope rotulo={rotulo} nome={nome} erro={erro}>
      <input {...props} name={nome} className={BORDA} />
    </Envelope>
  )
}

export function CampoTexto({
  rotulo,
  nome,
  erro,
  ...props
}: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Envelope rotulo={rotulo} nome={nome} erro={erro}>
      <textarea {...props} name={nome} rows={3} className={BORDA} />
    </Envelope>
  )
}

export function CampoSelecao({
  rotulo,
  nome,
  erro,
  opcoes,
  ...props
}: Base &
  SelectHTMLAttributes<HTMLSelectElement> & {
    opcoes: { valor: string; texto: string }[]
  }) {
  return (
    <Envelope rotulo={rotulo} nome={nome} erro={erro}>
      <select {...props} name={nome} className={BORDA}>
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.texto}
          </option>
        ))}
      </select>
    </Envelope>
  )
}
```

- [ ] **Step 2: Criar a casca com menu lateral**

`src/app/(app)/layout.tsx`:

```tsx
import Link from 'next/link'
import { sair } from '@/modulos/auth/acoes'
import { exigirUsuario } from '@/modulos/auth/guarda'
import { Botao } from '@/componentes/botao'

const MENU = [
  { href: '/clientes', texto: 'Clientes' },
  { href: '/catalogo/servicos', texto: 'Catálogo' },
  { href: '/configuracoes', texto: 'Configurações' },
]

export default async function LayoutAplicacao({
  children,
}: {
  children: React.ReactNode
}) {
  const usuario = await exigirUsuario()

  return (
    <div className="flex min-h-screen">
      <nav className="flex w-56 flex-col justify-between border-r border-gray-200 bg-gray-50 p-4">
        <div>
          <p className="mb-6 font-semibold">Planeta Motores</p>
          <ul className="flex flex-col gap-1">
            {MENU.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block rounded px-2 py-1.5 text-sm hover:bg-gray-200">
                  {item.texto}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <form action={sair} className="flex flex-col gap-2">
          <span className="text-xs text-gray-600">{usuario.nome}</span>
          <Botao variante="secundario" type="submit">
            Sair
          </Botao>
        </form>
      </nav>

      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Ajustar a raiz da aplicação**

Em `src/app/layout.tsx`, trocar o idioma: `<html lang="pt-BR">`.

Substituir `src/app/page.tsx` por:

```tsx
import { redirect } from 'next/navigation'

export default function PaginaInicial() {
  redirect('/clientes')
}
```

- [ ] **Step 4: Criar a lista de clientes com busca**

`src/app/(app)/clientes/busca.tsx`:

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function CampoBusca() {
  const router = useRouter()
  const parametros = useSearchParams()

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault()
        const termo = new FormData(evento.currentTarget).get('busca')
        router.push(termo ? `/clientes?busca=${encodeURIComponent(String(termo))}` : '/clientes')
      }}
    >
      <input
        name="busca"
        defaultValue={parametros.get('busca') ?? ''}
        placeholder="Buscar por nome ou CPF/CNPJ"
        aria-label="Buscar cliente"
        className="w-80 rounded border border-gray-300 px-3 py-2 text-sm"
      />
    </form>
  )
}
```

`src/app/(app)/clientes/page.tsx`:

```tsx
import Link from 'next/link'
import { listarClientes } from '@/modulos/clientes/consultas'
import { CampoBusca } from './busca'

export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>
}) {
  const { busca } = await searchParams
  const lista = await listarClientes({ busca })

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <Link href="/clientes/novo" className="rounded bg-blue-600 px-3 py-2 text-sm text-white">
          Novo cliente
        </Link>
      </header>

      <CampoBusca />

      {lista.length === 0 ? (
        <p className="text-sm text-gray-600">
          {busca ? 'Nenhum cliente encontrado para essa busca.' : 'Nenhum cliente cadastrado ainda.'}
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-600">
            <tr>
              <th className="py-2">Nome</th>
              <th className="py-2">Telefone</th>
              <th className="py-2">Cidade</th>
              <th className="py-2">Equipamentos</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((cliente) => (
              <tr key={cliente.id} className="border-b border-gray-100">
                <td className="py-2">
                  <Link href={`/clientes/${cliente.id}`} className="text-blue-700 hover:underline">
                    {cliente.nome}
                  </Link>
                </td>
                <td className="py-2">{cliente.telefone ?? '—'}</td>
                <td className="py-2">{cliente.cidade ?? '—'}</td>
                <td className="py-2">{cliente.quantidadeEquipamentos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
```

- [ ] **Step 5: Escrever o teste ponta a ponta da lista**

`testes/e2e/clientes-lista.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { db } from '../../src/db'
import { clientes, usuarios } from '../../src/db/schema'
import { gerarHash } from '../../src/modulos/auth/senha'
import { limparBanco } from '../ajuda/banco'

test.beforeEach(async ({ page }) => {
  await limparBanco()
  await db.insert(usuarios).values({
    nome: 'Lucilene',
    email: 'lucilene@planetamotores.com.br',
    senhaHash: await gerarHash('motor2tempos'),
  })
  await db.insert(clientes).values([
    { nome: 'Verde Jardins Paisagismo', cidade: 'São Paulo' },
    { nome: 'Lava-jato Cruz', cidade: 'Osasco' },
  ])

  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill('lucilene@planetamotores.com.br')
  await page.getByLabel('Senha').fill('motor2tempos')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/clientes$/)
})

test('lista os clientes em ordem alfabética', async ({ page }) => {
  const nomes = await page.getByRole('cell').filter({ hasText: /Verde|Lava/ }).allInnerTexts()
  expect(nomes).toEqual(['Lava-jato Cruz', 'Verde Jardins Paisagismo'])
})

test('a busca filtra a lista', async ({ page }) => {
  await page.getByLabel('Buscar cliente').fill('jardins')
  await page.getByLabel('Buscar cliente').press('Enter')

  await expect(page.getByText('Verde Jardins Paisagismo')).toBeVisible()
  await expect(page.getByText('Lava-jato Cruz')).toHaveCount(0)
})

test('o menu mostra o nome do usuário e permite sair', async ({ page }) => {
  await expect(page.getByText('Lucilene')).toBeVisible()

  await page.getByRole('button', { name: 'Sair' }).click()

  await expect(page).toHaveURL(/\/entrar$/)
})
```

- [ ] **Step 6: Rodar os testes ponta a ponta**

Run: `npx playwright test`
Expected: PASS — os 3 testes de `login.spec.ts` (agora que `/clientes` existe) e os 3 de `clientes-lista.spec.ts`.

- [ ] **Step 7: Rodar a suíte de unidade e integração**

Run: `npm test`
Expected: PASS, sem regressão.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Adiciona casca da aplicacao com menu lateral e lista de clientes com busca"
```

---

### Task 11: Formulário e ficha do cliente, com equipamentos

Entrega: cadastrar, editar e inativar cliente pela tela, e gerenciar os equipamentos dele na ficha.

**Files:**
- Create: `src/modulos/clientes/acoes.ts`, `src/app/(app)/clientes/formulario.tsx`, `src/app/(app)/clientes/novo/page.tsx`, `src/app/(app)/clientes/[id]/page.tsx`, `src/app/(app)/clientes/[id]/editar/page.tsx`, `src/app/(app)/clientes/[id]/equipamento-formulario.tsx`, `testes/e2e/clientes-cadastro.spec.ts`
- Test: `testes/e2e/clientes-cadastro.spec.ts`

**Interfaces:**
- Consumes: `entradaCliente`, `entradaEquipamento`, `criarCliente`, `atualizarCliente`, `definirAtivoCliente`, `criarEquipamento`, `definirAtivoEquipamento`, `obterCliente`, `listarEquipamentosDoCliente`, `APLICACOES`, `falhaDeValidacao`, componentes de interface.
- Produces (Server Actions, todas com a assinatura `(anterior, formulario) => Promise<Resultado<…>>` salvo indicação):
  - `acaoCriarCliente`, `acaoAtualizarCliente`
  - `acaoDefinirAtivoCliente(formulario: FormData): Promise<void>`
  - `acaoCriarEquipamento`
  - `acaoDefinirAtivoEquipamento(formulario: FormData): Promise<void>`

- [ ] **Step 1: Escrever as Server Actions**

`src/modulos/clientes/acoes.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { falhaDeValidacao, type Resultado } from '@/lib/resultado'
import { entradaCliente } from './esquemas'
import { entradaEquipamento } from './equipamentos-esquemas'
import { atualizarCliente, criarCliente, definirAtivoCliente } from './operacoes'
import { criarEquipamento, definirAtivoEquipamento } from './equipamentos-operacoes'

function objeto(formulario: FormData): Record<string, string> {
  const dados: Record<string, string> = {}
  for (const [chave, valor] of formulario.entries()) dados[chave] = String(valor)
  return dados
}

export async function acaoCriarCliente(
  _anterior: Resultado<{ id: string }> | null,
  formulario: FormData,
): Promise<Resultado<{ id: string }>> {
  const analise = entradaCliente.safeParse(objeto(formulario))
  if (!analise.success) return falhaDeValidacao(analise.error)

  const r = await criarCliente(analise.data)
  if (!r.ok) return r

  revalidatePath('/clientes')
  redirect(`/clientes/${r.dados.id}`)
}

export async function acaoAtualizarCliente(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  const id = String(formulario.get('id') ?? '')
  const analise = entradaCliente.safeParse(objeto(formulario))
  if (!analise.success) return falhaDeValidacao(analise.error)

  const r = await atualizarCliente(id, analise.data)
  if (!r.ok) return r

  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
  redirect(`/clientes/${id}`)
}

export async function acaoDefinirAtivoCliente(formulario: FormData): Promise<void> {
  const id = String(formulario.get('id') ?? '')
  await definirAtivoCliente(id, formulario.get('ativo') === 'true')
  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
}

export async function acaoCriarEquipamento(
  _anterior: Resultado<{ id: string }> | null,
  formulario: FormData,
): Promise<Resultado<{ id: string }>> {
  const analise = entradaEquipamento.safeParse(objeto(formulario))
  if (!analise.success) return falhaDeValidacao(analise.error)

  const r = await criarEquipamento(analise.data)
  if (!r.ok) return r

  revalidatePath(`/clientes/${analise.data.clienteId}`)
  return r
}

export async function acaoDefinirAtivoEquipamento(formulario: FormData): Promise<void> {
  await definirAtivoEquipamento(
    String(formulario.get('id') ?? ''),
    formulario.get('ativo') === 'true',
  )
  revalidatePath(`/clientes/${String(formulario.get('clienteId') ?? '')}`)
}
```

- [ ] **Step 2: Criar o formulário de cliente**

`src/app/(app)/clientes/formulario.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao, CampoTexto } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoAtualizarCliente, acaoCriarCliente } from '@/modulos/clientes/acoes'

type Cliente = {
  id: string
  nome: string
  tipoPessoa: 'fisica' | 'juridica'
  documento: string | null
  telefone: string | null
  email: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
  observacoes: string | null
}

export function FormularioCliente({ cliente }: { cliente?: Cliente }) {
  const acao = cliente ? acaoAtualizarCliente : acaoCriarCliente
  const [resultado, enviar, pendente] = useActionState(acao as never, null)
  const campos = resultado && !resultado.ok ? (resultado.campos ?? {}) : {}

  return (
    <form action={enviar} className="flex max-w-2xl flex-col gap-4">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}

      <div className="grid grid-cols-2 gap-4">
        <Campo rotulo="Nome" nome="nome" required defaultValue={cliente?.nome ?? ''} erro={campos.nome} />
        <CampoSelecao
          rotulo="Tipo de pessoa"
          nome="tipoPessoa"
          defaultValue={cliente?.tipoPessoa ?? 'fisica'}
          opcoes={[
            { valor: 'fisica', texto: 'Pessoa física' },
            { valor: 'juridica', texto: 'Pessoa jurídica' },
          ]}
        />
        <Campo rotulo="CPF/CNPJ" nome="documento" defaultValue={cliente?.documento ?? ''} erro={campos.documento} />
        <Campo rotulo="Telefone" nome="telefone" defaultValue={cliente?.telefone ?? ''} erro={campos.telefone} />
        <Campo rotulo="E-mail" nome="email" type="email" defaultValue={cliente?.email ?? ''} erro={campos.email} />
        <Campo rotulo="CEP" nome="cep" defaultValue={cliente?.cep ?? ''} erro={campos.cep} />
        <Campo rotulo="Logradouro" nome="logradouro" defaultValue={cliente?.logradouro ?? ''} />
        <Campo rotulo="Número" nome="numero" defaultValue={cliente?.numero ?? ''} />
        <Campo rotulo="Complemento" nome="complemento" defaultValue={cliente?.complemento ?? ''} />
        <Campo rotulo="Bairro" nome="bairro" defaultValue={cliente?.bairro ?? ''} />
        <Campo rotulo="Cidade" nome="cidade" defaultValue={cliente?.cidade ?? ''} />
        <Campo rotulo="UF" nome="uf" maxLength={2} defaultValue={cliente?.uf ?? ''} />
      </div>

      <CampoTexto rotulo="Observações" nome="observacoes" defaultValue={cliente?.observacoes ?? ''} />

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}

      <Botao type="submit" disabled={pendente} className="self-start">
        {pendente ? 'Salvando…' : 'Salvar'}
      </Botao>
    </form>
  )
}
```

- [ ] **Step 3: Criar as páginas de novo e de edição**

`src/app/(app)/clientes/novo/page.tsx`:

```tsx
import { FormularioCliente } from '../formulario'

export default function PaginaNovoCliente() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Novo cliente</h1>
      <FormularioCliente />
    </section>
  )
}
```

`src/app/(app)/clientes/[id]/editar/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { obterCliente } from '@/modulos/clientes/consultas'
import { FormularioCliente } from '../../formulario'

export default async function PaginaEditarCliente({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cliente = await obterCliente(id)
  if (!cliente) notFound()

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Editar {cliente.nome}</h1>
      <FormularioCliente cliente={cliente} />
    </section>
  )
}
```

- [ ] **Step 4: Criar o formulário de equipamento**

`src/app/(app)/clientes/[id]/equipamento-formulario.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoCriarEquipamento } from '@/modulos/clientes/acoes'
import { APLICACOES } from '@/modulos/clientes/equipamentos-descricao'

export function FormularioEquipamento({ clienteId }: { clienteId: string }) {
  const [resultado, enviar, pendente] = useActionState(acaoCriarEquipamento, null)

  return (
    <form action={enviar} className="flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4">
      <input type="hidden" name="clienteId" value={clienteId} />

      <CampoSelecao
        rotulo="Aplicação"
        nome="aplicacao"
        opcoes={Object.entries(APLICACOES).map(([valor, texto]) => ({ valor, texto }))}
      />
      <CampoSelecao
        rotulo="Motor"
        nome="tipoMotor"
        opcoes={[
          { valor: '2T', texto: '2 tempos' },
          { valor: '4T', texto: '4 tempos' },
        ]}
      />
      <Campo rotulo="Marca" nome="marca" />
      <Campo rotulo="Modelo" nome="modelo" />
      <Campo rotulo="Número de série" nome="numeroSerie" />

      <Botao type="submit" disabled={pendente}>
        {pendente ? 'Adicionando…' : 'Adicionar equipamento'}
      </Botao>

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
    </form>
  )
}
```

- [ ] **Step 5: Criar a ficha do cliente**

`src/app/(app)/clientes/[id]/page.tsx`:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Botao } from '@/componentes/botao'
import { formatarData } from '@/lib/datas'
import { acaoDefinirAtivoCliente, acaoDefinirAtivoEquipamento } from '@/modulos/clientes/acoes'
import { obterCliente } from '@/modulos/clientes/consultas'
import { listarEquipamentosDoCliente } from '@/modulos/clientes/equipamentos-consultas'
import { FormularioEquipamento } from './equipamento-formulario'

export default async function FichaCliente({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cliente = await obterCliente(id)
  if (!cliente) notFound()

  const equipamentos = await listarEquipamentosDoCliente(id)

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{cliente.nome}</h1>
          <p className="text-sm text-gray-600">
            {cliente.telefone ?? 'sem telefone'} · cadastrado em {formatarData(cliente.criadoEm)}
            {!cliente.ativo && ' · inativo'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/clientes/${id}/editar`} className="rounded border border-gray-300 px-3 py-2 text-sm">
            Editar
          </Link>
          <form action={acaoDefinirAtivoCliente}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="ativo" value={cliente.ativo ? 'false' : 'true'} />
            <Botao variante="secundario" type="submit">
              {cliente.ativo ? 'Inativar' : 'Reativar'}
            </Botao>
          </form>
        </div>
      </header>

      <div className="text-sm text-gray-700">
        <p>
          {[cliente.logradouro, cliente.numero, cliente.bairro, cliente.cidade, cliente.uf]
            .filter(Boolean)
            .join(', ') || 'Endereço não informado'}
        </p>
        {cliente.observacoes && <p className="mt-2 whitespace-pre-line">{cliente.observacoes}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold">Equipamentos</h2>

        {equipamentos.length === 0 ? (
          <p className="text-sm text-gray-600">Nenhum equipamento cadastrado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {equipamentos.map((equipamento) => (
              <li
                key={equipamento.id}
                className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm"
              >
                <span>
                  {equipamento.descricao}
                  {equipamento.numeroSerie && (
                    <span className="text-gray-600"> · série {equipamento.numeroSerie}</span>
                  )}
                </span>
                <form action={acaoDefinirAtivoEquipamento}>
                  <input type="hidden" name="id" value={equipamento.id} />
                  <input type="hidden" name="clienteId" value={id} />
                  <input type="hidden" name="ativo" value="false" />
                  <Botao variante="secundario" type="submit">
                    Remover
                  </Botao>
                </form>
              </li>
            ))}
          </ul>
        )}

        <FormularioEquipamento clienteId={id} />
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Escrever o teste ponta a ponta do cadastro**

`testes/e2e/clientes-cadastro.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { db } from '../../src/db'
import { usuarios } from '../../src/db/schema'
import { gerarHash } from '../../src/modulos/auth/senha'
import { limparBanco } from '../ajuda/banco'

test.beforeEach(async ({ page }) => {
  await limparBanco()
  await db.insert(usuarios).values({
    nome: 'Lucilene',
    email: 'lucilene@planetamotores.com.br',
    senhaHash: await gerarHash('motor2tempos'),
  })

  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill('lucilene@planetamotores.com.br')
  await page.getByLabel('Senha').fill('motor2tempos')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/clientes$/)
})

test('cadastra o cliente e cai na ficha dele', async ({ page }) => {
  await page.getByRole('link', { name: 'Novo cliente' }).click()
  await page.getByLabel('Nome').fill('Marcos Andrade')
  await page.getByLabel('Telefone').fill('(11) 98765-4321')
  await page.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByRole('heading', { name: 'Marcos Andrade' })).toBeVisible()
  await expect(page.getByText('11987654321')).toBeVisible()
})

test('recusa cliente sem nome mostrando o erro no campo', async ({ page }) => {
  await page.getByRole('link', { name: 'Novo cliente' }).click()
  await page.getByLabel('Nome').fill('   ')
  await page.getByLabel('Nome').evaluate((campo: HTMLInputElement) => {
    campo.required = false
  })
  await page.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByText('Nome é obrigatório')).toBeVisible()
})

test('adiciona equipamento na ficha do cliente', async ({ page }) => {
  await page.getByRole('link', { name: 'Novo cliente' }).click()
  await page.getByLabel('Nome').fill('Marcos Andrade')
  await page.getByRole('button', { name: 'Salvar' }).click()

  await page.getByLabel('Marca').fill('Stihl')
  await page.getByLabel('Modelo').fill('FS 220')
  await page.getByRole('button', { name: 'Adicionar equipamento' }).click()

  await expect(page.getByText('Roçadeira Stihl FS 220 (2T)')).toBeVisible()
})

test('inativa o cliente e ele sai da lista', async ({ page }) => {
  await page.getByRole('link', { name: 'Novo cliente' }).click()
  await page.getByLabel('Nome').fill('Marcos Andrade')
  await page.getByRole('button', { name: 'Salvar' }).click()

  await page.getByRole('button', { name: 'Inativar' }).click()
  await expect(page.getByText('inativo')).toBeVisible()

  await page.goto('/clientes')
  await expect(page.getByText('Nenhum cliente cadastrado ainda.')).toBeVisible()
})
```

O passo que desliga `required` no terceiro teste é intencional: sem isso o navegador barra o envio e a validação do servidor nunca é exercitada.

- [ ] **Step 7: Rodar e confirmar que passa**

Run: `npx playwright test testes/e2e/clientes-cadastro.spec.ts`
Expected: PASS, 5 testes.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Adiciona formulario e ficha de cliente com gestao de equipamentos"
```

---

### Task 12: Schema do catálogo

Entrega: `servicos`, `pecas` e `fornecedores` migrados. As três tabelas juntas porque compartilham a migração e nenhuma tem regra própria ainda.

**Files:**
- Create: `src/db/schema/catalogo.ts`
- Modify: `src/db/schema/index.ts`
- Test: `testes/integracao/schema-catalogo.test.ts`

**Interfaces:**
- Consumes: `db`.
- Produces: tabelas `servicos`, `pecas`, `fornecedores`; enum `unidadePeca`.

- [ ] **Step 1: Escrever o teste que falha**

`testes/integracao/schema-catalogo.test.ts`:

```ts
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { fornecedores, pecas, servicos } from '../../src/db/schema'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

test('serviço nasce ativo com preço zero', async () => {
  const [servico] = await db.insert(servicos).values({ nome: 'Limpeza de carburador' }).returning()

  expect(servico.precoPadraoCentavos).toBe(0)
  expect(servico.ativo).toBe(true)
})

test('peça nasce sem controle de saldo e com mínimo zero', async () => {
  const [peca] = await db.insert(pecas).values({ nome: 'Kit cilindro 40mm' }).returning()

  expect(peca.controlaSaldo).toBe(false)
  expect(peca.unidade).toBe('un')
  // numeric volta como texto do driver; a conversão é responsabilidade da aplicação.
  expect(Number(peca.quantidadeMinima)).toBe(0)
})

test('peça guarda quantidade fracionada', async () => {
  const [peca] = await db
    .insert(pecas)
    .values({ nome: 'Óleo 2T', unidade: 'L', controlaSaldo: true, quantidadeMinima: '0.500' })
    .returning()

  expect(Number(peca.quantidadeMinima)).toBe(0.5)
})

test('fornecedor nasce ativo', async () => {
  const [fornecedor] = await db.insert(fornecedores).values({ nome: 'Peças Rio Claro' }).returning()

  expect(fornecedor.ativo).toBe(true)
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run testes/integracao/schema-catalogo.test.ts`
Expected: FAIL — `servicos` não é exportado por `src/db/schema`.

- [ ] **Step 3: Escrever o schema**

`src/db/schema/catalogo.ts`:

```ts
import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const unidadePeca = pgEnum('unidade_peca', ['un', 'L', 'kg', 'm'])

export const servicos = pgTable('servicos', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  precoPadraoCentavos: integer('preco_padrao_centavos').notNull().default(0),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

export const pecas = pgTable('pecas', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  marca: text('marca'),
  unidade: unidadePeca('unidade').notNull().default('un'),
  /** Liga o acompanhamento de saldo e a presença na tela de reposição. */
  controlaSaldo: boolean('controla_saldo').notNull().default(false),
  quantidadeMinima: numeric('quantidade_minima', { precision: 12, scale: 3 })
    .notNull()
    .default('0'),
  ultimoCustoCentavos: integer('ultimo_custo_centavos'),
  precoVendaCentavos: integer('preco_venda_centavos').notNull().default(0),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

export const fornecedores = pgTable('fornecedores', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  telefone: text('telefone'),
  email: text('email'),
  observacoes: text('observacoes'),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})
```

Acrescentar a `src/db/schema/index.ts`:

```ts
export * from './catalogo'
```

- [ ] **Step 4: Gerar e aplicar a migração**

```bash
npm run banco:gerar
npm run banco:aplicar
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx vitest run testes/integracao/schema-catalogo.test.ts`
Expected: PASS, 4 testes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Adiciona schema do catalogo de servicos, pecas e fornecedores"
```

---

### Task 13: Catálogo de serviços

Entrega: cadastrar serviço com preço padrão — a tabela de onde o orçamento do Plano 2 monta suas linhas.

**Files:**
- Create: `src/modulos/catalogo/servicos-esquemas.ts`, `src/modulos/catalogo/servicos-consultas.ts`, `src/modulos/catalogo/servicos-operacoes.ts`, `src/modulos/catalogo/acoes.ts`, `src/app/(app)/catalogo/layout.tsx`, `src/app/(app)/catalogo/servicos/page.tsx`, `src/app/(app)/catalogo/servicos/formulario.tsx`
- Test: `testes/integracao/catalogo-servicos.test.ts`, `testes/e2e/catalogo-servicos.spec.ts`

**Interfaces:**
- Consumes: `db`, `servicos`, `Resultado`, `textoObrigatorio`, `parsearReais`, `formatarReais`, componentes de interface.
- Produces:
  - `entradaServico` (Zod, converte o preço digitado em centavos) e `type EntradaServico = { nome: string; descricao: string | null; precoPadraoCentavos: number }`
  - `listarServicos(incluirInativos?: boolean): Promise<(typeof servicos.$inferSelect)[]>`
  - `obterServico(id: string): Promise<typeof servicos.$inferSelect | null>`
  - `criarServico(entrada: EntradaServico): Promise<Resultado<{ id: string }>>`
  - `atualizarServico(id: string, entrada: EntradaServico): Promise<Resultado<null>>`
  - `definirAtivoServico(id: string, ativo: boolean): Promise<Resultado<null>>`
  - Server Actions `acaoSalvarServico`, `acaoDefinirAtivoServico`

- [ ] **Step 1: Escrever o teste que falha**

`testes/integracao/catalogo-servicos.test.ts`:

```ts
import { beforeEach, expect, test } from 'vitest'
import { entradaServico } from '../../src/modulos/catalogo/servicos-esquemas'
import { listarServicos, obterServico } from '../../src/modulos/catalogo/servicos-consultas'
import {
  atualizarServico,
  criarServico,
  definirAtivoServico,
} from '../../src/modulos/catalogo/servicos-operacoes'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

function entrada(extra: Record<string, unknown> = {}) {
  return entradaServico.parse({
    nome: 'Limpeza de carburador',
    descricao: '',
    precoPadrao: '62,00',
    ...extra,
  })
}

test('o preço digitado é guardado em centavos', async () => {
  const r = await criarServico(entrada({ precoPadrao: '1.250,50' }))

  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect((await obterServico(r.dados.id))?.precoPadraoCentavos).toBe(125050)
})

test('preço em branco vale zero', async () => {
  const r = await criarServico(entrada({ precoPadrao: '' }))

  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect((await obterServico(r.dados.id))?.precoPadraoCentavos).toBe(0)
})

test('preço com texto inválido é recusado na validação', () => {
  expect(() => entrada({ precoPadrao: 'caro' })).toThrow()
})

test('lista em ordem alfabética e esconde inativos', async () => {
  await criarServico(entrada({ nome: 'Retífica de cilindro' }))
  const limpeza = await criarServico(entrada({ nome: 'Limpeza de carburador' }))
  if (!limpeza.ok) throw new Error('criação falhou')

  expect((await listarServicos()).map((s) => s.nome)).toEqual([
    'Limpeza de carburador',
    'Retífica de cilindro',
  ])

  await definirAtivoServico(limpeza.dados.id, false)

  expect((await listarServicos()).map((s) => s.nome)).toEqual(['Retífica de cilindro'])
  expect(await listarServicos(true)).toHaveLength(2)
})

test('atualiza nome e preço', async () => {
  const criado = await criarServico(entrada())
  if (!criado.ok) throw new Error('criação falhou')

  const r = await atualizarServico(
    criado.dados.id,
    entrada({ nome: 'Limpeza completa', precoPadrao: '80,00' }),
  )

  expect(r.ok).toBe(true)
  const servico = await obterServico(criado.dados.id)
  expect(servico?.nome).toBe('Limpeza completa')
  expect(servico?.precoPadraoCentavos).toBe(8000)
})

test('atualizar serviço inexistente falha sem estourar', async () => {
  const r = await atualizarServico('00000000-0000-0000-0000-000000000000', entrada())

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Serviço não encontrado.')
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run testes/integracao/catalogo-servicos.test.ts`
Expected: FAIL — não resolve os módulos de serviço.

- [ ] **Step 3: Implementar `servicos-esquemas.ts`**

```ts
import { z } from 'zod'
import { parsearReais } from '@/lib/dinheiro'
import { textoObrigatorio } from '@/lib/validacao'

/** Campo de dinheiro digitado: vazio vale zero, texto inválido é recusado. */
export const precoDigitado = z
  .string()
  .trim()
  .transform((valor, contexto) => {
    if (valor === '') return 0
    const centavos = parsearReais(valor)
    if (centavos === null) {
      contexto.addIssue({ code: 'custom', message: 'Informe um valor como 1.250,50' })
      return z.NEVER
    }
    return centavos
  })

export const entradaServico = z.object({
  nome: textoObrigatorio('Nome'),
  descricao: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v)),
  precoPadrao: precoDigitado,
})

export type EntradaServicoFormulario = z.infer<typeof entradaServico>

export type EntradaServico = {
  nome: string
  descricao: string | null
  precoPadraoCentavos: number
}

export function paraEntradaServico(dados: EntradaServicoFormulario): EntradaServico {
  return {
    nome: dados.nome,
    descricao: dados.descricao,
    precoPadraoCentavos: dados.precoPadrao,
  }
}
```

- [ ] **Step 4: Implementar `servicos-operacoes.ts`**

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { servicos } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import {
  paraEntradaServico,
  type EntradaServico,
  type EntradaServicoFormulario,
} from './servicos-esquemas'

function normalizar(entrada: EntradaServico | EntradaServicoFormulario): EntradaServico {
  return 'precoPadrao' in entrada ? paraEntradaServico(entrada) : entrada
}

export async function criarServico(
  entrada: EntradaServico | EntradaServicoFormulario,
): Promise<Resultado<{ id: string }>> {
  const [criado] = await db
    .insert(servicos)
    .values(normalizar(entrada))
    .returning({ id: servicos.id })
  return sucesso({ id: criado.id })
}

export async function atualizarServico(
  id: string,
  entrada: EntradaServico | EntradaServicoFormulario,
): Promise<Resultado<null>> {
  const alterados = await db
    .update(servicos)
    .set(normalizar(entrada))
    .where(eq(servicos.id, id))
    .returning({ id: servicos.id })

  if (alterados.length === 0) return falha('Serviço não encontrado.')
  return sucesso(null)
}

export async function definirAtivoServico(
  id: string,
  ativo: boolean,
): Promise<Resultado<null>> {
  const alterados = await db
    .update(servicos)
    .set({ ativo })
    .where(eq(servicos.id, id))
    .returning({ id: servicos.id })

  if (alterados.length === 0) return falha('Serviço não encontrado.')
  return sucesso(null)
}
```

- [ ] **Step 5: Implementar `servicos-consultas.ts`**

```ts
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { servicos } from '@/db/schema'

export async function listarServicos(incluirInativos = false) {
  const consulta = db.select().from(servicos).orderBy(asc(servicos.nome))
  return incluirInativos ? consulta : consulta.where(eq(servicos.ativo, true))
}

export async function obterServico(id: string) {
  const [linha] = await db.select().from(servicos).where(eq(servicos.id, id)).limit(1)
  return linha ?? null
}
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `npx vitest run testes/integracao/catalogo-servicos.test.ts`
Expected: PASS, 6 testes.

- [ ] **Step 7: Criar as Server Actions do catálogo**

`src/modulos/catalogo/acoes.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { falhaDeValidacao, type Resultado } from '@/lib/resultado'
import { entradaServico } from './servicos-esquemas'
import {
  atualizarServico,
  criarServico,
  definirAtivoServico,
} from './servicos-operacoes'

function objeto(formulario: FormData): Record<string, string> {
  const dados: Record<string, string> = {}
  for (const [chave, valor] of formulario.entries()) dados[chave] = String(valor)
  return dados
}

export async function acaoSalvarServico(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  const analise = entradaServico.safeParse(objeto(formulario))
  if (!analise.success) return falhaDeValidacao(analise.error)

  const id = String(formulario.get('id') ?? '')
  const r = id ? await atualizarServico(id, analise.data) : await criarServico(analise.data)
  if (!r.ok) return r

  revalidatePath('/catalogo/servicos')
  return { ok: true, dados: null }
}

export async function acaoDefinirAtivoServico(formulario: FormData): Promise<void> {
  await definirAtivoServico(
    String(formulario.get('id') ?? ''),
    formulario.get('ativo') === 'true',
  )
  revalidatePath('/catalogo/servicos')
}
```

- [ ] **Step 8: Criar as telas do catálogo**

`src/app/(app)/catalogo/layout.tsx`:

```tsx
import Link from 'next/link'

const ABAS = [
  { href: '/catalogo/servicos', texto: 'Serviços' },
  { href: '/catalogo/pecas', texto: 'Peças' },
  { href: '/catalogo/fornecedores', texto: 'Fornecedores' },
]

export default function LayoutCatalogo({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Catálogo</h1>
      <nav className="flex gap-4 border-b border-gray-200 pb-2 text-sm">
        {ABAS.map((aba) => (
          <Link key={aba.href} href={aba.href} className="text-blue-700 hover:underline">
            {aba.texto}
          </Link>
        ))}
      </nav>
      {children}
    </section>
  )
}
```

As abas de Peças e Fornecedores só respondem depois das Tasks 14 e 15. Elas entram aqui porque o layout é compartilhado e criá-lo três vezes seria pior.

`src/app/(app)/catalogo/servicos/formulario.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoSalvarServico } from '@/modulos/catalogo/acoes'

export function FormularioServico() {
  const [resultado, enviar, pendente] = useActionState(acaoSalvarServico, null)
  const campos = resultado && !resultado.ok ? (resultado.campos ?? {}) : {}

  return (
    <form action={enviar} className="flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4">
      <Campo rotulo="Nome do serviço" nome="nome" required erro={campos.nome} />
      <Campo rotulo="Preço padrão" nome="precoPadrao" placeholder="0,00" erro={campos.precoPadrao} />
      <Campo rotulo="Descrição" nome="descricao" />
      <Botao type="submit" disabled={pendente}>
        {pendente ? 'Salvando…' : 'Adicionar serviço'}
      </Botao>
      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
    </form>
  )
}
```

`src/app/(app)/catalogo/servicos/page.tsx`:

```tsx
import { Botao } from '@/componentes/botao'
import { formatarReais } from '@/lib/dinheiro'
import { acaoDefinirAtivoServico } from '@/modulos/catalogo/acoes'
import { listarServicos } from '@/modulos/catalogo/servicos-consultas'
import { FormularioServico } from './formulario'

export default async function PaginaServicos() {
  const lista = await listarServicos()

  return (
    <div className="flex flex-col gap-4">
      <FormularioServico />

      {lista.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhum serviço cadastrado ainda.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-600">
            <tr>
              <th className="py-2">Serviço</th>
              <th className="py-2">Preço padrão</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {lista.map((servico) => (
              <tr key={servico.id} className="border-b border-gray-100">
                <td className="py-2">{servico.nome}</td>
                <td className="py-2">{formatarReais(servico.precoPadraoCentavos)}</td>
                <td className="py-2 text-right">
                  <form action={acaoDefinirAtivoServico}>
                    <input type="hidden" name="id" value={servico.id} />
                    <input type="hidden" name="ativo" value="false" />
                    <Botao variante="secundario" type="submit">
                      Remover
                    </Botao>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

- [ ] **Step 9: Escrever o teste ponta a ponta**

`testes/e2e/catalogo-servicos.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { db } from '../../src/db'
import { usuarios } from '../../src/db/schema'
import { gerarHash } from '../../src/modulos/auth/senha'
import { limparBanco } from '../ajuda/banco'

test.beforeEach(async ({ page }) => {
  await limparBanco()
  await db.insert(usuarios).values({
    nome: 'Lucilene',
    email: 'lucilene@planetamotores.com.br',
    senhaHash: await gerarHash('motor2tempos'),
  })

  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill('lucilene@planetamotores.com.br')
  await page.getByLabel('Senha').fill('motor2tempos')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.goto('/catalogo/servicos')
})

test('cadastra serviço com preço e mostra formatado', async ({ page }) => {
  await page.getByLabel('Nome do serviço').fill('Retífica de cilindro')
  await page.getByLabel('Preço padrão').fill('1.250,50')
  await page.getByRole('button', { name: 'Adicionar serviço' }).click()

  await expect(page.getByText('Retífica de cilindro')).toBeVisible()
  await expect(page.getByText('R$ 1.250,50')).toBeVisible()
})

test('recusa preço inválido com mensagem no campo', async ({ page }) => {
  await page.getByLabel('Nome do serviço').fill('Serviço qualquer')
  await page.getByLabel('Preço padrão').fill('caro')
  await page.getByRole('button', { name: 'Adicionar serviço' }).click()

  await expect(page.getByText('Informe um valor como 1.250,50')).toBeVisible()
})

test('remover tira o serviço da lista', async ({ page }) => {
  await page.getByLabel('Nome do serviço').fill('Serviço temporário')
  await page.getByRole('button', { name: 'Adicionar serviço' }).click()
  await expect(page.getByText('Serviço temporário')).toBeVisible()

  await page.getByRole('button', { name: 'Remover' }).click()

  await expect(page.getByText('Nenhum serviço cadastrado ainda.')).toBeVisible()
})
```

- [ ] **Step 10: Rodar e confirmar que passa**

Run: `npx playwright test testes/e2e/catalogo-servicos.spec.ts`
Expected: PASS, 3 testes.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "Adiciona catalogo de servicos com preco padrao"
```

---

### Task 14: Catálogo de peças

Entrega: cadastro de peça com unidade, controle de saldo e quantidade mínima. Inclui a conversão de quantidade fracionada, que o Plano 2 usa em todo movimento de estoque.

**Files:**
- Create: `src/lib/quantidade.ts`, `src/modulos/catalogo/pecas-esquemas.ts`, `src/modulos/catalogo/pecas-consultas.ts`, `src/modulos/catalogo/pecas-operacoes.ts`, `src/app/(app)/catalogo/pecas/page.tsx`, `src/app/(app)/catalogo/pecas/formulario.tsx`
- Modify: `src/modulos/catalogo/acoes.ts` (acrescentar as ações de peça)
- Test: `testes/unidade/quantidade.test.ts`, `testes/integracao/catalogo-pecas.test.ts`

**Interfaces:**
- Consumes: `db`, `pecas`, `Resultado`, `textoObrigatorio`, `precoDigitado`, `formatarReais`.
- Produces:
  - `formatarQuantidade(valor: string | number): string` — `"0.500"` → `"0,5"`
  - `parsearQuantidade(texto: string): number | null` — `"0,5"` → `0.5`
  - `entradaPeca` (Zod) e `type EntradaPeca`
  - `listarPecas(incluirInativas?: boolean)`, `obterPeca(id: string)`
  - `criarPeca(entrada)`, `atualizarPeca(id, entrada)`, `definirAtivoPeca(id, ativo)`
  - Server Actions `acaoSalvarPeca`, `acaoDefinirAtivoPeca`

- [ ] **Step 1: Escrever o teste de quantidade que falha**

`testes/unidade/quantidade.test.ts`:

```ts
import { expect, test } from 'vitest'
import { formatarQuantidade, parsearQuantidade } from '../../src/lib/quantidade'

test('formata quantidade inteira sem casas decimais', () => {
  expect(formatarQuantidade('2.000')).toBe('2')
  expect(formatarQuantidade(4)).toBe('4')
})

test('formata fração com vírgula e sem zeros à direita', () => {
  expect(formatarQuantidade('0.500')).toBe('0,5')
  expect(formatarQuantidade('1.250')).toBe('1,25')
})

test('lê quantidade com vírgula ou ponto', () => {
  expect(parsearQuantidade('0,5')).toBe(0.5)
  expect(parsearQuantidade('0.5')).toBe(0.5)
  expect(parsearQuantidade('3')).toBe(3)
})

test('recusa quantidade inválida ou negativa', () => {
  expect(parsearQuantidade('muito')).toBeNull()
  expect(parsearQuantidade('-1')).toBeNull()
  expect(parsearQuantidade('')).toBeNull()
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run testes/unidade/quantidade.test.ts`
Expected: FAIL — não resolve `src/lib/quantidade`.

- [ ] **Step 3: Implementar `quantidade.ts`**

```ts
/**
 * O driver do Postgres devolve `numeric` como texto ("0.500"). Estas duas
 * funções são a única fronteira entre esse texto e o número que o usuário vê.
 */
export function formatarQuantidade(valor: string | number): string {
  const numero = typeof valor === 'string' ? Number(valor) : valor
  if (!Number.isFinite(numero)) return '0'
  // Até três casas, sem zeros à direita: 2.000 → "2", 0.500 → "0,5".
  return numero.toFixed(3).replace(/\.?0+$/, '').replace('.', ',')
}

export function parsearQuantidade(texto: string): number | null {
  const limpo = texto.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,3})?$/.test(limpo)) return null
  const numero = Number(limpo)
  return Number.isFinite(numero) ? numero : null
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run testes/unidade/quantidade.test.ts`
Expected: PASS, 4 testes.

- [ ] **Step 5: Escrever o teste de peças que falha**

`testes/integracao/catalogo-pecas.test.ts`:

```ts
import { beforeEach, expect, test } from 'vitest'
import { entradaPeca } from '../../src/modulos/catalogo/pecas-esquemas'
import { listarPecas, obterPeca } from '../../src/modulos/catalogo/pecas-consultas'
import {
  atualizarPeca,
  criarPeca,
  definirAtivoPeca,
} from '../../src/modulos/catalogo/pecas-operacoes'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

function entrada(extra: Record<string, unknown> = {}) {
  return entradaPeca.parse({
    nome: 'Óleo 2 tempos',
    marca: 'Ipiranga',
    unidade: 'L',
    controlaSaldo: 'on',
    quantidadeMinima: '0,5',
    precoVenda: '38,00',
    ...extra,
  })
}

test('grava unidade, controle de saldo e mínimo fracionado', async () => {
  const r = await criarPeca(entrada())

  expect(r.ok).toBe(true)
  if (!r.ok) return
  const peca = await obterPeca(r.dados.id)
  expect(peca?.unidade).toBe('L')
  expect(peca?.controlaSaldo).toBe(true)
  expect(Number(peca?.quantidadeMinima)).toBe(0.5)
  expect(peca?.precoVendaCentavos).toBe(3800)
})

test('caixa de seleção desmarcada desliga o controle de saldo', async () => {
  const r = await criarPeca(entrada({ controlaSaldo: undefined }))

  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect((await obterPeca(r.dados.id))?.controlaSaldo).toBe(false)
})

test('quantidade mínima inválida é recusada na validação', () => {
  expect(() => entrada({ quantidadeMinima: 'meio litro' })).toThrow()
})

test('lista em ordem alfabética e esconde inativas', async () => {
  await criarPeca(entrada({ nome: 'Vela NGK' }))
  const oleo = await criarPeca(entrada({ nome: 'Óleo 2 tempos' }))
  if (!oleo.ok) throw new Error('criação falhou')

  expect((await listarPecas()).map((p) => p.nome)).toEqual(['Óleo 2 tempos', 'Vela NGK'])

  await definirAtivoPeca(oleo.dados.id, false)

  expect((await listarPecas()).map((p) => p.nome)).toEqual(['Vela NGK'])
  expect(await listarPecas(true)).toHaveLength(2)
})

test('atualizar peça inexistente falha sem estourar', async () => {
  const r = await atualizarPeca('00000000-0000-0000-0000-000000000000', entrada())

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Peça não encontrada.')
})
```

- [ ] **Step 6: Rodar e confirmar a falha**

Run: `npx vitest run testes/integracao/catalogo-pecas.test.ts`
Expected: FAIL — não resolve os módulos de peça.

- [ ] **Step 7: Implementar `pecas-esquemas.ts`**

```ts
import { z } from 'zod'
import { parsearQuantidade } from '@/lib/quantidade'
import { textoObrigatorio } from '@/lib/validacao'
import { precoDigitado } from './servicos-esquemas'

const quantidadeDigitada = z
  .string()
  .trim()
  .optional()
  .transform((valor, contexto) => {
    if (!valor) return 0
    const numero = parsearQuantidade(valor)
    if (numero === null) {
      contexto.addIssue({ code: 'custom', message: 'Informe uma quantidade como 0,5' })
      return z.NEVER
    }
    return numero
  })

export const entradaPeca = z.object({
  nome: textoObrigatorio('Nome'),
  marca: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  unidade: z.enum(['un', 'L', 'kg', 'm']),
  // Caixa de seleção não enviada quando desmarcada; ausência significa desligado.
  controlaSaldo: z
    .string()
    .optional()
    .transform((v) => v === 'on' || v === 'true'),
  quantidadeMinima: quantidadeDigitada,
  precoVenda: precoDigitado,
})

export type EntradaPecaFormulario = z.infer<typeof entradaPeca>

export type EntradaPeca = {
  nome: string
  marca: string | null
  unidade: 'un' | 'L' | 'kg' | 'm'
  controlaSaldo: boolean
  quantidadeMinima: string
  precoVendaCentavos: number
}

export function paraEntradaPeca(dados: EntradaPecaFormulario): EntradaPeca {
  return {
    nome: dados.nome,
    marca: dados.marca,
    unidade: dados.unidade,
    controlaSaldo: dados.controlaSaldo,
    // numeric é escrito como texto para não perder precisão no caminho.
    quantidadeMinima: dados.quantidadeMinima.toFixed(3),
    precoVendaCentavos: dados.precoVenda,
  }
}
```

- [ ] **Step 8: Implementar `pecas-operacoes.ts` e `pecas-consultas.ts`**

`src/modulos/catalogo/pecas-operacoes.ts`:

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { pecas } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import {
  paraEntradaPeca,
  type EntradaPeca,
  type EntradaPecaFormulario,
} from './pecas-esquemas'

function normalizar(entrada: EntradaPeca | EntradaPecaFormulario): EntradaPeca {
  return 'precoVenda' in entrada ? paraEntradaPeca(entrada) : entrada
}

export async function criarPeca(
  entrada: EntradaPeca | EntradaPecaFormulario,
): Promise<Resultado<{ id: string }>> {
  const [criada] = await db.insert(pecas).values(normalizar(entrada)).returning({ id: pecas.id })
  return sucesso({ id: criada.id })
}

export async function atualizarPeca(
  id: string,
  entrada: EntradaPeca | EntradaPecaFormulario,
): Promise<Resultado<null>> {
  const alteradas = await db
    .update(pecas)
    .set(normalizar(entrada))
    .where(eq(pecas.id, id))
    .returning({ id: pecas.id })

  if (alteradas.length === 0) return falha('Peça não encontrada.')
  return sucesso(null)
}

export async function definirAtivoPeca(id: string, ativo: boolean): Promise<Resultado<null>> {
  const alteradas = await db
    .update(pecas)
    .set({ ativo })
    .where(eq(pecas.id, id))
    .returning({ id: pecas.id })

  if (alteradas.length === 0) return falha('Peça não encontrada.')
  return sucesso(null)
}
```

`src/modulos/catalogo/pecas-consultas.ts`:

```ts
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { pecas } from '@/db/schema'

export async function listarPecas(incluirInativas = false) {
  const consulta = db.select().from(pecas).orderBy(asc(pecas.nome))
  return incluirInativas ? consulta : consulta.where(eq(pecas.ativo, true))
}

export async function obterPeca(id: string) {
  const [linha] = await db.select().from(pecas).where(eq(pecas.id, id)).limit(1)
  return linha ?? null
}
```

- [ ] **Step 9: Rodar e confirmar que passa**

Run: `npx vitest run testes/integracao/catalogo-pecas.test.ts`
Expected: PASS, 5 testes.

- [ ] **Step 10: Acrescentar as ações de peça**

Ao final de `src/modulos/catalogo/acoes.ts`, acrescentar (e importar `entradaPeca` de `./pecas-esquemas` e as três operações de `./pecas-operacoes`):

```ts
export async function acaoSalvarPeca(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  const analise = entradaPeca.safeParse(objeto(formulario))
  if (!analise.success) return falhaDeValidacao(analise.error)

  const id = String(formulario.get('id') ?? '')
  const r = id ? await atualizarPeca(id, analise.data) : await criarPeca(analise.data)
  if (!r.ok) return r

  revalidatePath('/catalogo/pecas')
  return { ok: true, dados: null }
}

export async function acaoDefinirAtivoPeca(formulario: FormData): Promise<void> {
  await definirAtivoPeca(String(formulario.get('id') ?? ''), formulario.get('ativo') === 'true')
  revalidatePath('/catalogo/pecas')
}
```

Atenção: `objeto()` percorre `formulario.entries()`, e caixa de seleção desmarcada simplesmente não aparece ali — é disso que o esquema depende para desligar `controlaSaldo`.

- [ ] **Step 11: Criar a tela de peças**

`src/app/(app)/catalogo/pecas/formulario.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoSalvarPeca } from '@/modulos/catalogo/acoes'

export function FormularioPeca() {
  const [resultado, enviar, pendente] = useActionState(acaoSalvarPeca, null)
  const campos = resultado && !resultado.ok ? (resultado.campos ?? {}) : {}

  return (
    <form action={enviar} className="flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4">
      <Campo rotulo="Nome da peça" nome="nome" required erro={campos.nome} />
      <Campo rotulo="Marca" nome="marca" />
      <CampoSelecao
        rotulo="Unidade"
        nome="unidade"
        opcoes={[
          { valor: 'un', texto: 'unidade' },
          { valor: 'L', texto: 'litro' },
          { valor: 'kg', texto: 'quilo' },
          { valor: 'm', texto: 'metro' },
        ]}
      />
      <Campo rotulo="Preço de venda" nome="precoVenda" placeholder="0,00" erro={campos.precoVenda} />
      <Campo
        rotulo="Quantidade mínima"
        nome="quantidadeMinima"
        placeholder="0"
        erro={campos.quantidadeMinima}
      />
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" name="controlaSaldo" />
        Controla saldo em estoque
      </label>
      <Botao type="submit" disabled={pendente}>
        {pendente ? 'Salvando…' : 'Adicionar peça'}
      </Botao>
      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
    </form>
  )
}
```

`src/app/(app)/catalogo/pecas/page.tsx`:

```tsx
import { Botao } from '@/componentes/botao'
import { formatarReais } from '@/lib/dinheiro'
import { formatarQuantidade } from '@/lib/quantidade'
import { acaoDefinirAtivoPeca } from '@/modulos/catalogo/acoes'
import { listarPecas } from '@/modulos/catalogo/pecas-consultas'
import { FormularioPeca } from './formulario'

export default async function PaginaPecas() {
  const lista = await listarPecas()

  return (
    <div className="flex flex-col gap-4">
      <FormularioPeca />

      {lista.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhuma peça cadastrada ainda.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-600">
            <tr>
              <th className="py-2">Peça</th>
              <th className="py-2">Unidade</th>
              <th className="py-2">Preço de venda</th>
              <th className="py-2">Estoque</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {lista.map((peca) => (
              <tr key={peca.id} className="border-b border-gray-100">
                <td className="py-2">
                  {peca.nome}
                  {peca.marca && <span className="text-gray-600"> · {peca.marca}</span>}
                </td>
                <td className="py-2">{peca.unidade}</td>
                <td className="py-2">{formatarReais(peca.precoVendaCentavos)}</td>
                <td className="py-2">
                  {peca.controlaSaldo
                    ? `mínimo ${formatarQuantidade(peca.quantidadeMinima)}`
                    : 'compra sob demanda'}
                </td>
                <td className="py-2 text-right">
                  <form action={acaoDefinirAtivoPeca}>
                    <input type="hidden" name="id" value={peca.id} />
                    <input type="hidden" name="ativo" value="false" />
                    <Botao variante="secundario" type="submit">
                      Remover
                    </Botao>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

- [ ] **Step 12: Verificar na tela**

Run: `npm run dev`, acessar `/catalogo/pecas`, cadastrar "Óleo 2 tempos", unidade litro, marcar controle de saldo, mínimo `0,5`.
Expected: a linha aparece com "mínimo 0,5"; uma peça sem controle aparece como "compra sob demanda".

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "Adiciona catalogo de pecas com unidade, controle de saldo e minimo"
```

---

### Task 15: Catálogo de fornecedores

Entrega: o cadastro que o Plano 2 usa para lançar compra de peça.

**Files:**
- Create: `src/modulos/catalogo/fornecedores-esquemas.ts`, `src/modulos/catalogo/fornecedores-consultas.ts`, `src/modulos/catalogo/fornecedores-operacoes.ts`, `src/app/(app)/catalogo/fornecedores/page.tsx`, `src/app/(app)/catalogo/fornecedores/formulario.tsx`
- Modify: `src/modulos/catalogo/acoes.ts`
- Test: `testes/integracao/catalogo-fornecedores.test.ts`

**Interfaces:**
- Consumes: `db`, `fornecedores`, `Resultado`, `textoObrigatorio`, `telefoneOpcional`.
- Produces:
  - `entradaFornecedor` (Zod) e `type EntradaFornecedor`
  - `listarFornecedores(incluirInativos?: boolean)`, `obterFornecedor(id: string)`
  - `criarFornecedor(entrada)`, `atualizarFornecedor(id, entrada)`, `definirAtivoFornecedor(id, ativo)`
  - Server Actions `acaoSalvarFornecedor`, `acaoDefinirAtivoFornecedor`

- [ ] **Step 1: Escrever o teste que falha**

`testes/integracao/catalogo-fornecedores.test.ts`:

```ts
import { beforeEach, expect, test } from 'vitest'
import { entradaFornecedor } from '../../src/modulos/catalogo/fornecedores-esquemas'
import {
  listarFornecedores,
  obterFornecedor,
} from '../../src/modulos/catalogo/fornecedores-consultas'
import {
  atualizarFornecedor,
  criarFornecedor,
  definirAtivoFornecedor,
} from '../../src/modulos/catalogo/fornecedores-operacoes'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

function entrada(extra: Record<string, unknown> = {}) {
  return entradaFornecedor.parse({
    nome: 'Peças Rio Claro',
    telefone: '(19) 3524-1122',
    email: '',
    observacoes: '',
    ...extra,
  })
}

test('grava o telefone somente com dígitos', async () => {
  const r = await criarFornecedor(entrada())

  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect((await obterFornecedor(r.dados.id))?.telefone).toBe('1935241122')
})

test('telefone sem DDD é recusado', () => {
  expect(() => entrada({ telefone: '35241122' })).toThrow()
})

test('lista em ordem alfabética e esconde inativos', async () => {
  await criarFornecedor(entrada({ nome: 'Zona Sul Motopeças' }))
  const rioClaro = await criarFornecedor(entrada({ nome: 'Peças Rio Claro' }))
  if (!rioClaro.ok) throw new Error('criação falhou')

  expect((await listarFornecedores()).map((f) => f.nome)).toEqual([
    'Peças Rio Claro',
    'Zona Sul Motopeças',
  ])

  await definirAtivoFornecedor(rioClaro.dados.id, false)

  expect((await listarFornecedores()).map((f) => f.nome)).toEqual(['Zona Sul Motopeças'])
  expect(await listarFornecedores(true)).toHaveLength(2)
})

test('atualizar fornecedor inexistente falha sem estourar', async () => {
  const r = await atualizarFornecedor('00000000-0000-0000-0000-000000000000', entrada())

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Fornecedor não encontrado.')
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run testes/integracao/catalogo-fornecedores.test.ts`
Expected: FAIL — não resolve os módulos de fornecedor.

- [ ] **Step 3: Implementar `fornecedores-esquemas.ts`**

```ts
import { z } from 'zod'
import { telefoneOpcional, textoObrigatorio } from '@/lib/validacao'

// `.optional()` é obrigatório aqui: campo opcional que o formulário não envia
// chega como chave ausente, e sem isso o Zod reprova a entrada inteira.
const opcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))

export const entradaFornecedor = z.object({
  nome: textoObrigatorio('Nome'),
  telefone: telefoneOpcional,
  email: opcional,
  observacoes: opcional,
})

export type EntradaFornecedor = z.infer<typeof entradaFornecedor>
```

- [ ] **Step 4: Implementar operações e consultas**

`src/modulos/catalogo/fornecedores-operacoes.ts`:

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { fornecedores } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import type { EntradaFornecedor } from './fornecedores-esquemas'

export async function criarFornecedor(
  entrada: EntradaFornecedor,
): Promise<Resultado<{ id: string }>> {
  const [criado] = await db
    .insert(fornecedores)
    .values(entrada)
    .returning({ id: fornecedores.id })
  return sucesso({ id: criado.id })
}

export async function atualizarFornecedor(
  id: string,
  entrada: EntradaFornecedor,
): Promise<Resultado<null>> {
  const alterados = await db
    .update(fornecedores)
    .set(entrada)
    .where(eq(fornecedores.id, id))
    .returning({ id: fornecedores.id })

  if (alterados.length === 0) return falha('Fornecedor não encontrado.')
  return sucesso(null)
}

export async function definirAtivoFornecedor(
  id: string,
  ativo: boolean,
): Promise<Resultado<null>> {
  const alterados = await db
    .update(fornecedores)
    .set({ ativo })
    .where(eq(fornecedores.id, id))
    .returning({ id: fornecedores.id })

  if (alterados.length === 0) return falha('Fornecedor não encontrado.')
  return sucesso(null)
}
```

`src/modulos/catalogo/fornecedores-consultas.ts`:

```ts
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { fornecedores } from '@/db/schema'

export async function listarFornecedores(incluirInativos = false) {
  const consulta = db.select().from(fornecedores).orderBy(asc(fornecedores.nome))
  return incluirInativos ? consulta : consulta.where(eq(fornecedores.ativo, true))
}

export async function obterFornecedor(id: string) {
  const [linha] = await db
    .select()
    .from(fornecedores)
    .where(eq(fornecedores.id, id))
    .limit(1)
  return linha ?? null
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx vitest run testes/integracao/catalogo-fornecedores.test.ts`
Expected: PASS, 4 testes.

- [ ] **Step 6: Acrescentar as ações e a tela**

Ao final de `src/modulos/catalogo/acoes.ts` (importando `entradaFornecedor` e as três operações de fornecedor):

```ts
export async function acaoSalvarFornecedor(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  const analise = entradaFornecedor.safeParse(objeto(formulario))
  if (!analise.success) return falhaDeValidacao(analise.error)

  const id = String(formulario.get('id') ?? '')
  const r = id
    ? await atualizarFornecedor(id, analise.data)
    : await criarFornecedor(analise.data)
  if (!r.ok) return r

  revalidatePath('/catalogo/fornecedores')
  return { ok: true, dados: null }
}

export async function acaoDefinirAtivoFornecedor(formulario: FormData): Promise<void> {
  await definirAtivoFornecedor(
    String(formulario.get('id') ?? ''),
    formulario.get('ativo') === 'true',
  )
  revalidatePath('/catalogo/fornecedores')
}
```

`src/app/(app)/catalogo/fornecedores/formulario.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoSalvarFornecedor } from '@/modulos/catalogo/acoes'

export function FormularioFornecedor() {
  const [resultado, enviar, pendente] = useActionState(acaoSalvarFornecedor, null)
  const campos = resultado && !resultado.ok ? (resultado.campos ?? {}) : {}

  return (
    <form action={enviar} className="flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4">
      <Campo rotulo="Nome" nome="nome" required erro={campos.nome} />
      <Campo rotulo="Telefone" nome="telefone" erro={campos.telefone} />
      <Campo rotulo="E-mail" nome="email" />
      <Campo rotulo="Observações" nome="observacoes" />
      <Botao type="submit" disabled={pendente}>
        {pendente ? 'Salvando…' : 'Adicionar fornecedor'}
      </Botao>
      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
    </form>
  )
}
```

`src/app/(app)/catalogo/fornecedores/page.tsx`:

```tsx
import { Botao } from '@/componentes/botao'
import { acaoDefinirAtivoFornecedor } from '@/modulos/catalogo/acoes'
import { listarFornecedores } from '@/modulos/catalogo/fornecedores-consultas'
import { FormularioFornecedor } from './formulario'

export default async function PaginaFornecedores() {
  const lista = await listarFornecedores()

  return (
    <div className="flex flex-col gap-4">
      <FormularioFornecedor />

      {lista.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhum fornecedor cadastrado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {lista.map((fornecedor) => (
            <li
              key={fornecedor.id}
              className="flex items-center justify-between rounded border border-gray-200 px-3 py-2"
            >
              <span>
                {fornecedor.nome}
                {fornecedor.telefone && (
                  <span className="text-gray-600"> · {fornecedor.telefone}</span>
                )}
              </span>
              <form action={acaoDefinirAtivoFornecedor}>
                <input type="hidden" name="id" value={fornecedor.id} />
                <input type="hidden" name="ativo" value="false" />
                <Botao variante="secundario" type="submit">
                  Remover
                </Botao>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Verificar na tela**

Run: `npm run dev`, acessar `/catalogo/fornecedores`, cadastrar um fornecedor com telefone.
Expected: aparece na lista com o telefone só em dígitos.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Adiciona catalogo de fornecedores"
```

---

### Task 16: Configurações da empresa

Entrega: os dados que alimentam os PDFs e as mensagens dos Planos 2 e 3, editáveis pela tela.

**Files:**
- Create: `src/modulos/configuracoes/esquemas.ts`, `src/modulos/configuracoes/consultas.ts`, `src/modulos/configuracoes/operacoes.ts`, `src/modulos/configuracoes/acoes.ts`, `src/app/(app)/configuracoes/page.tsx`, `src/app/(app)/configuracoes/formulario.tsx`
- Test: `testes/integracao/configuracoes.test.ts`, `testes/e2e/configuracoes.spec.ts`

**Interfaces:**
- Consumes: `db`, `configuracoes`, `Resultado`, `textoObrigatorio`, `documentoOpcional`, `telefoneOpcional`.
- Produces:
  - `LINHA_UNICA = 1`
  - `obterConfiguracoes(): Promise<typeof configuracoes.$inferSelect>` — cria a linha na primeira chamada
  - `entradaConfiguracoes` (Zod) e `type EntradaConfiguracoes`
  - `salvarConfiguracoes(entrada: EntradaConfiguracoes): Promise<Resultado<null>>`
  - Server Action `acaoSalvarConfiguracoes`

- [ ] **Step 1: Escrever o teste que falha**

`testes/integracao/configuracoes.test.ts`:

```ts
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { configuracoes } from '../../src/db/schema'
import { obterConfiguracoes } from '../../src/modulos/configuracoes/consultas'
import { entradaConfiguracoes } from '../../src/modulos/configuracoes/esquemas'
import { salvarConfiguracoes } from '../../src/modulos/configuracoes/operacoes'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

test('a primeira leitura cria a linha com os padrões', async () => {
  const linha = await obterConfiguracoes()

  expect(linha.id).toBe(1)
  expect(linha.empresaNome).toBe('Planeta Motores')
  expect(linha.orcamentoValidadeDias).toBe(15)
})

test('leituras repetidas não criam linha nova', async () => {
  await obterConfiguracoes()
  await obterConfiguracoes()

  expect(await db.select().from(configuracoes)).toHaveLength(1)
})

test('salva os dados da empresa e os modelos de mensagem', async () => {
  const entrada = entradaConfiguracoes.parse({
    empresaNome: 'Planeta Motores ME',
    empresaCnpj: '12.345.678/0001-95',
    empresaTelefone: '(19) 3524-1122',
    empresaEndereco: 'Rua das Oficinas, 100',
    orcamentoValidadeDias: '10',
    modeloMsgOrcamento: 'Orçamento da OS {{numero}}: {{total}}',
    modeloMsgPronto: 'OS {{numero}} pronta',
    modeloMsgCobranca: 'Saldo de {{saldo}} na OS {{numero}}',
  })

  const r = await salvarConfiguracoes(entrada)

  expect(r.ok).toBe(true)
  const linha = await obterConfiguracoes()
  expect(linha.empresaNome).toBe('Planeta Motores ME')
  expect(linha.empresaCnpj).toBe('12345678000195')
  expect(linha.empresaTelefone).toBe('1935241122')
  expect(linha.orcamentoValidadeDias).toBe(10)
  expect(linha.modeloMsgPronto).toBe('OS {{numero}} pronta')
})

test('nome da empresa em branco é recusado', () => {
  expect(() =>
    entradaConfiguracoes.parse({
      empresaNome: '  ',
      empresaCnpj: '',
      empresaTelefone: '',
      empresaEndereco: '',
      orcamentoValidadeDias: '15',
      modeloMsgOrcamento: 'a',
      modeloMsgPronto: 'b',
      modeloMsgCobranca: 'c',
    }),
  ).toThrow('Nome da empresa é obrigatório')
})

test('validade do orçamento precisa ser pelo menos um dia', () => {
  expect(() =>
    entradaConfiguracoes.parse({
      empresaNome: 'Planeta Motores',
      empresaCnpj: '',
      empresaTelefone: '',
      empresaEndereco: '',
      orcamentoValidadeDias: '0',
      modeloMsgOrcamento: 'a',
      modeloMsgPronto: 'b',
      modeloMsgCobranca: 'c',
    }),
  ).toThrow()
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run testes/integracao/configuracoes.test.ts`
Expected: FAIL — não resolve os módulos de configurações.

- [ ] **Step 3: Implementar `esquemas.ts`**

```ts
import { z } from 'zod'
import { documentoOpcional, telefoneOpcional, textoObrigatorio } from '@/lib/validacao'

// `.optional()` é obrigatório aqui: campo opcional que o formulário não envia
// chega como chave ausente, e sem isso o Zod reprova a entrada inteira.
const opcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))

export const entradaConfiguracoes = z.object({
  empresaNome: textoObrigatorio('Nome da empresa'),
  empresaCnpj: documentoOpcional,
  empresaTelefone: telefoneOpcional,
  empresaEndereco: opcional,
  orcamentoValidadeDias: z.coerce
    .number()
    .int('Informe um número inteiro de dias')
    .min(1, 'A validade precisa ser de pelo menos um dia'),
  modeloMsgOrcamento: textoObrigatorio('Mensagem de orçamento'),
  modeloMsgPronto: textoObrigatorio('Mensagem de serviço pronto'),
  modeloMsgCobranca: textoObrigatorio('Mensagem de cobrança'),
})

export type EntradaConfiguracoes = z.infer<typeof entradaConfiguracoes>
```

- [ ] **Step 4: Implementar `consultas.ts` e `operacoes.ts`**

`src/modulos/configuracoes/consultas.ts`:

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { configuracoes } from '@/db/schema'

export const LINHA_UNICA = 1

/**
 * Cria a linha na primeira leitura. Deixar a tabela vazia obrigaria toda tela
 * consumidora a tratar o caso "não configurado", que não existe de fato.
 */
export async function obterConfiguracoes() {
  const [existente] = await db
    .select()
    .from(configuracoes)
    .where(eq(configuracoes.id, LINHA_UNICA))
    .limit(1)
  if (existente) return existente

  const [criada] = await db
    .insert(configuracoes)
    .values({ id: LINHA_UNICA })
    .onConflictDoNothing()
    .returning()
  if (criada) return criada

  // Outra requisição criou a linha entre o select e o insert.
  const [linha] = await db
    .select()
    .from(configuracoes)
    .where(eq(configuracoes.id, LINHA_UNICA))
    .limit(1)
  return linha
}
```

`src/modulos/configuracoes/operacoes.ts`:

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { configuracoes } from '@/db/schema'
import { sucesso, type Resultado } from '@/lib/resultado'
import { LINHA_UNICA, obterConfiguracoes } from './consultas'
import type { EntradaConfiguracoes } from './esquemas'

export async function salvarConfiguracoes(
  entrada: EntradaConfiguracoes,
): Promise<Resultado<null>> {
  await obterConfiguracoes() // garante a existência da linha
  await db
    .update(configuracoes)
    .set({ ...entrada, atualizadoEm: new Date() })
    .where(eq(configuracoes.id, LINHA_UNICA))
  return sucesso(null)
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx vitest run testes/integracao/configuracoes.test.ts`
Expected: PASS, 5 testes.

- [ ] **Step 6: Criar a ação e a tela**

`src/modulos/configuracoes/acoes.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { falhaDeValidacao, type Resultado } from '@/lib/resultado'
import { entradaConfiguracoes } from './esquemas'
import { salvarConfiguracoes } from './operacoes'

export async function acaoSalvarConfiguracoes(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  const dados: Record<string, string> = {}
  for (const [chave, valor] of formulario.entries()) dados[chave] = String(valor)

  const analise = entradaConfiguracoes.safeParse(dados)
  if (!analise.success) return falhaDeValidacao(analise.error)

  const r = await salvarConfiguracoes(analise.data)
  if (!r.ok) return r

  revalidatePath('/configuracoes')
  return { ok: true, dados: null }
}
```

`src/app/(app)/configuracoes/formulario.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoTexto } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoSalvarConfiguracoes } from '@/modulos/configuracoes/acoes'

type Valores = {
  empresaNome: string
  empresaCnpj: string | null
  empresaTelefone: string | null
  empresaEndereco: string | null
  orcamentoValidadeDias: number
  modeloMsgOrcamento: string
  modeloMsgPronto: string
  modeloMsgCobranca: string
}

export function FormularioConfiguracoes({ valores }: { valores: Valores }) {
  const [resultado, enviar, pendente] = useActionState(acaoSalvarConfiguracoes, null)
  const campos = resultado && !resultado.ok ? (resultado.campos ?? {}) : {}

  return (
    <form action={enviar} className="flex max-w-2xl flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Campo
          rotulo="Nome da empresa"
          nome="empresaNome"
          required
          defaultValue={valores.empresaNome}
          erro={campos.empresaNome}
        />
        <Campo
          rotulo="CNPJ"
          nome="empresaCnpj"
          defaultValue={valores.empresaCnpj ?? ''}
          erro={campos.empresaCnpj}
        />
        <Campo
          rotulo="Telefone"
          nome="empresaTelefone"
          defaultValue={valores.empresaTelefone ?? ''}
          erro={campos.empresaTelefone}
        />
        <Campo
          rotulo="Validade do orçamento (dias)"
          nome="orcamentoValidadeDias"
          type="number"
          min={1}
          defaultValue={valores.orcamentoValidadeDias}
          erro={campos.orcamentoValidadeDias}
        />
      </div>

      <CampoTexto
        rotulo="Endereço"
        nome="empresaEndereco"
        defaultValue={valores.empresaEndereco ?? ''}
      />

      <p className="text-xs text-gray-600">
        Nas mensagens você pode usar <code>{'{{cliente}}'}</code>, <code>{'{{numero}}'}</code>,{' '}
        <code>{'{{equipamento}}'}</code>, <code>{'{{total}}'}</code> e <code>{'{{saldo}}'}</code>.
      </p>

      <CampoTexto
        rotulo="Mensagem de orçamento"
        nome="modeloMsgOrcamento"
        defaultValue={valores.modeloMsgOrcamento}
        erro={campos.modeloMsgOrcamento}
      />
      <CampoTexto
        rotulo="Mensagem de serviço pronto"
        nome="modeloMsgPronto"
        defaultValue={valores.modeloMsgPronto}
        erro={campos.modeloMsgPronto}
      />
      <CampoTexto
        rotulo="Mensagem de cobrança"
        nome="modeloMsgCobranca"
        defaultValue={valores.modeloMsgCobranca}
        erro={campos.modeloMsgCobranca}
      />

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
      {resultado?.ok && <p className="text-sm text-green-700">Configurações salvas.</p>}

      <Botao type="submit" disabled={pendente} className="self-start">
        {pendente ? 'Salvando…' : 'Salvar'}
      </Botao>
    </form>
  )
}
```

`src/app/(app)/configuracoes/page.tsx`:

```tsx
import { obterConfiguracoes } from '@/modulos/configuracoes/consultas'
import { FormularioConfiguracoes } from './formulario'

export default async function PaginaConfiguracoes() {
  const valores = await obterConfiguracoes()

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Configurações</h1>
      <FormularioConfiguracoes valores={valores} />
    </section>
  )
}
```

- [ ] **Step 7: Escrever o teste ponta a ponta**

`testes/e2e/configuracoes.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { db } from '../../src/db'
import { usuarios } from '../../src/db/schema'
import { gerarHash } from '../../src/modulos/auth/senha'
import { limparBanco } from '../ajuda/banco'

test.beforeEach(async ({ page }) => {
  await limparBanco()
  await db.insert(usuarios).values({
    nome: 'Lucilene',
    email: 'lucilene@planetamotores.com.br',
    senhaHash: await gerarHash('motor2tempos'),
  })

  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill('lucilene@planetamotores.com.br')
  await page.getByLabel('Senha').fill('motor2tempos')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.goto('/configuracoes')
})

test('salva os dados da empresa e mantém depois de recarregar', async ({ page }) => {
  await page.getByLabel('Nome da empresa').fill('Planeta Motores ME')
  await page.getByLabel('Telefone').fill('(19) 3524-1122')
  await page.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByText('Configurações salvas.')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Nome da empresa')).toHaveValue('Planeta Motores ME')
  await expect(page.getByLabel('Telefone')).toHaveValue('1935241122')
})

test('recusa validade de orçamento zerada', async ({ page }) => {
  await page.getByLabel('Validade do orçamento (dias)').fill('0')
  await page.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByText('A validade precisa ser de pelo menos um dia')).toBeVisible()
})
```

- [ ] **Step 8: Rodar e confirmar que passa**

Run: `npx playwright test testes/e2e/configuracoes.spec.ts`
Expected: PASS, 2 testes.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Adiciona configuracoes da empresa e modelos de mensagem"
```

---

## Verificação final do Plano 1

- [ ] **Rodar a suíte completa**

Run: `npm test`
Expected: PASS em todos os arquivos de `testes/unidade` e `testes/integracao`.

Run: `npx playwright test`
Expected: PASS nos cinco arquivos de `testes/e2e`.

- [ ] **Compilar para produção**

Run: `npm run build`
Expected: build concluído sem erro de tipo. Erro de tipo aqui costuma vir do `useActionState` com Server Action de assinatura divergente — confira se a ação recebe `(anterior, formulario)` na ordem certa.

- [ ] **Conferir à mão o caminho completo**

Com `npm run dev` e o usuário criado no Task 6:

1. Entrar em `/entrar`.
2. Cadastrar um cliente com telefone e CPF.
3. Adicionar dois equipamentos a ele, um 2T e um 4T.
4. Cadastrar dois serviços com preço e duas peças, uma com controle de saldo e uma sob demanda.
5. Cadastrar um fornecedor.
6. Preencher as configurações da empresa.
7. Buscar o cliente pelo CPF com pontuação na lista de clientes.

Expected: todos os sete passos concluem, e a base está pronta para o Plano 2 abrir a primeira ordem de serviço.

- [ ] **Commit final**

```bash
git add -A
git commit -m "Conclui fundacao e cadastros do sistema Planeta Motores"
```

## O que este plano deliberadamente não faz

Cobre as seções 1 a 6 e 10 (parte de cadastros), 12 e 13 do spec. Fica para os planos seguintes:

- **Plano 2** — ordens de serviço (seções 7 e 8 do spec): tabelas `ordens_servico`, `os_itens`, `os_fotos`, `os_historico`, `os_orcamento_versoes`, `os_numeracao`, `estoque_movimentos`, `compras`, `compra_itens`; máquina de transições; baixa e estorno de estoque; telas de OS, estoque e compras. Move o destino do login para `/ordens-servico` e acrescenta as entradas correspondentes ao menu.
- **Plano 3** — financeiro, documentos e implantação (seções 9, 11 e 14 do spec): `pagamentos`, `despesas`, contas a receber, resultado do mês, os três PDFs, mensagens de WhatsApp, painel, exportação CSV, Docker Compose de produção com Caddy e o procedimento de deploy na VPS.

---

## Registro da execução

Este plano foi executado em 29/07/2026. Resultado: 94 testes de unidade e
integração, 15 ponta a ponta, `npm run build` sem erro de tipo, 11 rotas.

O código acima já incorpora as correções abaixo. Ficam registradas porque são
armadilhas que reaparecem nos Planos 2 e 3.

**Dois defeitos de aplicação que os testes pegaram:**

1. **Detecção de documento duplicado.** A versão original casava
   `String(erro).includes('clientes_documento_unico')`. O Drizzle embrulha o erro
   do Postgres num `DrizzleQueryError` cuja mensagem é apenas "Failed query:
   insert into…" — o nome da restrição vive no `cause`. Corrigido para verificar
   SQLSTATE `23505` mais `constraint_name`, percorrendo a cadeia de causas. Vale
   para qualquer restrição de unicidade que os planos seguintes adicionarem.

2. **Campo opcional reprovando chave ausente.** Os esquemas usavam
   `z.string().trim().transform(…)` para campo opcional. Sem `.optional()`, uma
   chave ausente é erro de validação — e o formulário de equipamento na ficha do
   cliente não tem campo de observações, então toda inclusão de equipamento
   falhava com "Confira os campos destacados". Corrigido em `validacao.ts`,
   `clientes/esquemas.ts`, `equipamentos-esquemas.ts`,
   `fornecedores-esquemas.ts` e `configuracoes/esquemas.ts`, com teste de
   regressão em `testes/integracao/equipamentos.test.ts`.

**Três armadilhas de teste ponta a ponta:**

3. `getByRole('alert')` é ambíguo em aplicação Next: o framework injeta
   `__next-route-announcer__` com esse mesmo papel. Localize pelo texto.

4. Depois de clicar em Entrar, **espere o redirecionamento** (`await
   expect(page).toHaveURL(…)`) antes de navegar para outra rota. Sair no meio
   aborta a ação de servidor e o cookie de sessão nunca é gravado — o sintoma é
   a tela seguinte não encontrar nenhum campo.

5. Validação de servidor só é exercitada se a restrição do navegador for
   removida antes do envio (`required`, `min`). Caso contrário o formulário nem
   chega ao servidor e o teste falha esperando uma mensagem que nunca aparece.

**Dois desvios de ambiente, deliberados:**

6. **Esqueleto escrito à mão em vez de `create-next-app`.** O diretório já tinha
   `.git`, `.gitignore` e `docs/`; o gerador é interativo nesse caso e
   sobrescreveria o `.gitignore` versionado. Os arquivos de configuração foram
   escritos direto, com o mesmo resultado.

7. **PostgreSQL 17 portátil em vez de serviço do Windows.** O instalador oficial
   exige elevação (UAC), que não pode ser respondida de forma automatizada — o
   `winget install` falha com `0x800704c7`. Foram usados os binários portáteis em
   `C:\Users\walde\apps\pgsql-17`, com cluster em `dados/`, codificação UTF-8 e
   ordenação ICU `pt-BR` (com locale `C` a lista de clientes ordenaria "Óleo"
   depois de "Vela"). Autenticação TCP mudada de `trust` para `scram-sha-256`.
   **Consequência a lembrar:** o banco não sobe no boot; use
   `.\scripts\banco-local.ps1 start`. O `docker-compose.dev.yml` segue no
   repositório para máquinas com Docker.
