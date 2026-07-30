# Planeta Motores — Plano 2: Ordens de Serviço e Estoque

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O núcleo operacional da oficina: a ordem de serviço percorrendo recebimento → diagnóstico → orçamento → aprovação → execução → conclusão → entrega, com fotos, histórico, versões de orçamento, razão de estoque e compras de peça.

**Architecture:** Segue as convenções do Plano 1 (ver `README.md`): cada módulo com `esquemas.ts` / `consultas.ts` / `operacoes.ts` / `acoes.ts`, dinheiro em centavos, Zod na fronteira, `Resultado` como retorno. Três acréscimos: a máquina de situações é uma função pura testável isolada; o saldo de estoque nunca é coluna, é soma de movimentos; e a transição para `pronto` é transacional, porque grava histórico e movimenta estoque junto.

**Tech Stack:** a mesma do Plano 1. Sem dependência nova.

**Spec:** `docs/superpowers/specs/2026-07-29-planeta-motores-design.md` (seções 7 e 8)
**Plano anterior:** `docs/superpowers/plans/2026-07-29-planeta-motores-fundacao-e-cadastros.md`

## Global Constraints

Valem todas as do Plano 1 (centavos inteiros, `numeric(12,3)`, `timestamptz`/`America/Sao_Paulo`, `uuid`, escrita só por Server Action validada com Zod, `Resultado` em vez de exceção, mensagens em português, código em português, nenhum módulo tocando tabela de outro). Mais estas:

- **A situação da OS só muda pela função de transição.** Nenhum `update` direto em `ordens_servico.situacao` fora de `os/operacoes.ts`.
- **Toda transição grava `os_historico`**, na mesma transação.
- **Saldo de estoque é `sum(quantidade)` do razão.** Nunca uma coluna atualizada.
- **Movimento de estoque nunca é apagado.** Correção se faz com movimento de sinal contrário.
- **Cobrança não é situação.** O fluxo termina em `entregue`; a condição de cobrança é calculada (Plano 3).
- Fotos ficam em `uploads/`, fora do git, servidas por rota que exige sessão.

## Estrutura de arquivos

**`src/db/schema/os.ts`** — `ordensServico`, `osItens`, `osFotos`, `osHistorico`, `osOrcamentoVersoes`, `osNumeracao`, enum `situacaoOs`, enum `tipoItemOs`, enum `momentoFoto`
**`src/db/schema/estoque.ts`** — `estoqueMovimentos`, `compras`, `compraItens`, enum `tipoMovimento`

| Módulo | Arquivos | Responsabilidade |
|---|---|---|
| `os/` | `situacoes.ts` | Máquina de transições e rótulos — **pura, sem banco** |
| | `totais.ts` | Cálculo de totais a partir dos itens — **pura** |
| | `esquemas.ts`, `consultas.ts`, `operacoes.ts`, `acoes.ts` | OS, itens, transições |
| | `fotos.ts` | Gravação e leitura de arquivo de foto |
| `estoque/` | `consultas.ts`, `operacoes.ts`, `acoes.ts` | Razão, saldo, reposição, ajuste |
| `compras/` | `esquemas.ts`, `consultas.ts`, `operacoes.ts`, `acoes.ts` | Compra com itens e custo |

**Telas:** `(app)/ordens-servico/` (lista, nova, `[id]` com abas), `(app)/estoque/`, `(app)/compras/`, e `api/fotos/[id]/route.ts`.

---

### Task 1: Schema de ordens de serviço, estoque e compras

**Files:**
- Create: `src/db/schema/os.ts`, `src/db/schema/estoque.ts`
- Modify: `src/db/schema/index.ts`
- Test: `testes/integracao/schema-os.test.ts`

**Interfaces:**
- Produces: as nove tabelas e os enums acima.

- [ ] **Step 1: Escrever o teste que falha**

`testes/integracao/schema-os.test.ts` cobre: OS nasce em `recebido` com `versao_orcamento` 0 e desconto 0; `numero` é único; apagar a OS apaga itens, fotos e histórico; item aceita quantidade fracionada; `os_numeracao` tem o ano como chave; movimento de estoque aceita quantidade negativa; apagar a compra apaga seus itens.

```ts
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import {
  clientes,
  compraItens,
  compras,
  equipamentos,
  estoqueMovimentos,
  fornecedores,
  ordensServico,
  osHistorico,
  osItens,
  osNumeracao,
  pecas,
} from '../../src/db/schema'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

async function baseOs() {
  const [cliente] = await db.insert(clientes).values({ nome: 'Marcos' }).returning()
  const [equipamento] = await db
    .insert(equipamentos)
    .values({ clienteId: cliente.id, tipoMotor: '2T', aplicacao: 'rocadeira' })
    .returning()
  const [os] = await db
    .insert(ordensServico)
    .values({ numero: '2026-0001', clienteId: cliente.id, equipamentoId: equipamento.id })
    .returning()
  return { cliente, equipamento, os }
}

test('a OS nasce recebida, sem orçamento e sem desconto', async () => {
  const { os } = await baseOs()

  expect(os.situacao).toBe('recebido')
  expect(os.versaoOrcamento).toBe(0)
  expect(os.descontoCentavos).toBe(0)
  expect(os.recebidoEm).toBeInstanceOf(Date)
})

test('o número da OS é único', async () => {
  const { cliente, equipamento } = await baseOs()

  await expect(
    db.insert(ordensServico).values({
      numero: '2026-0001',
      clienteId: cliente.id,
      equipamentoId: equipamento.id,
    }),
  ).rejects.toThrow()
})

test('apagar a OS apaga itens e histórico', async () => {
  const { os } = await baseOs()
  await db.insert(osItens).values({
    osId: os.id,
    tipo: 'servico',
    descricao: 'Limpeza',
    quantidade: '1',
    precoUnitarioCentavos: 6200,
  })
  await db.insert(osHistorico).values({ osId: os.id, situacaoNova: 'recebido' })

  await db.delete(ordensServico)

  expect(await db.select().from(osItens)).toHaveLength(0)
  expect(await db.select().from(osHistorico)).toHaveLength(0)
})

test('item da OS guarda quantidade fracionada', async () => {
  const { os } = await baseOs()

  const [item] = await db
    .insert(osItens)
    .values({
      osId: os.id,
      tipo: 'peca',
      descricao: 'Óleo 2T',
      quantidade: '0.500',
      precoUnitarioCentavos: 3800,
    })
    .returning()

  expect(Number(item.quantidade)).toBe(0.5)
})

test('a numeração é única por ano', async () => {
  await db.insert(osNumeracao).values({ ano: 2026, ultimoNumero: 1 })

  await expect(db.insert(osNumeracao).values({ ano: 2026, ultimoNumero: 2 })).rejects.toThrow()
})

test('movimento de estoque aceita quantidade negativa', async () => {
  const [peca] = await db.insert(pecas).values({ nome: 'Vela' }).returning()

  const [movimento] = await db
    .insert(estoqueMovimentos)
    .values({ pecaId: peca.id, tipo: 'saida_os', quantidade: '-2' })
    .returning()

  expect(Number(movimento.quantidade)).toBe(-2)
})

test('apagar a compra apaga seus itens', async () => {
  const [fornecedor] = await db.insert(fornecedores).values({ nome: 'Rio Claro' }).returning()
  const [peca] = await db.insert(pecas).values({ nome: 'Kit cilindro' }).returning()
  const [compra] = await db
    .insert(compras)
    .values({ fornecedorId: fornecedor.id, data: '2026-07-30' })
    .returning()
  await db.insert(compraItens).values({
    compraId: compra.id,
    pecaId: peca.id,
    quantidade: '1',
    custoUnitarioCentavos: 23000,
  })

  await db.delete(compras)

  expect(await db.select().from(compraItens)).toHaveLength(0)
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run testes/integracao/schema-os.test.ts`
Expected: FAIL — `ordensServico` não é exportado.

- [ ] **Step 3: Escrever `src/db/schema/os.ts`**

```ts
import {
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { clientes, equipamentos } from './clientes'
import { pecas, servicos } from './catalogo'
import { usuarios } from './usuarios'

export const situacaoOs = pgEnum('situacao_os', [
  'recebido',
  'em_diagnostico',
  'orcamento_enviado',
  'aprovado',
  'aguardando_peca',
  'em_execucao',
  'pronto',
  'entregue',
  'recusado',
  'devolvido',
  'cancelado',
])

export const tipoItemOs = pgEnum('tipo_item_os', ['peca', 'servico'])

export const momentoFoto = pgEnum('momento_foto', ['chegada', 'dano', 'conclusao'])

export const ordensServico = pgTable('ordens_servico', {
  id: uuid('id').primaryKey().defaultRandom(),
  numero: text('numero').notNull().unique(),
  clienteId: uuid('cliente_id')
    .notNull()
    .references(() => clientes.id, { onDelete: 'restrict' }),
  equipamentoId: uuid('equipamento_id')
    .notNull()
    .references(() => equipamentos.id, { onDelete: 'restrict' }),
  situacao: situacaoOs('situacao').notNull().default('recebido'),
  problemaRelatado: text('problema_relatado'),
  diagnostico: text('diagnostico'),
  acessoriosRecebidos: text('acessorios_recebidos'),
  /** 0 = nunca enviado; passa a 1 no primeiro envio de orçamento. */
  versaoOrcamento: integer('versao_orcamento').notNull().default(0),
  descontoCentavos: integer('desconto_centavos').notNull().default(0),
  notaFiscalReferencia: text('nota_fiscal_referencia'),
  observacoes: text('observacoes'),
  recebidoEm: timestamp('recebido_em', { withTimezone: true }).notNull().defaultNow(),
  diagnosticadoEm: timestamp('diagnosticado_em', { withTimezone: true }),
  orcadoEm: timestamp('orcado_em', { withTimezone: true }),
  aprovadoEm: timestamp('aprovado_em', { withTimezone: true }),
  recusadoEm: timestamp('recusado_em', { withTimezone: true }),
  motivoRecusa: text('motivo_recusa'),
  concluidoEm: timestamp('concluido_em', { withTimezone: true }),
  entregueEm: timestamp('entregue_em', { withTimezone: true }),
  canceladoEm: timestamp('cancelado_em', { withTimezone: true }),
  motivoCancelamento: text('motivo_cancelamento'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

export const osItens = pgTable('os_itens', {
  id: uuid('id').primaryKey().defaultRandom(),
  osId: uuid('os_id')
    .notNull()
    .references(() => ordensServico.id, { onDelete: 'cascade' }),
  tipo: tipoItemOs('tipo').notNull(),
  pecaId: uuid('peca_id').references(() => pecas.id, { onDelete: 'restrict' }),
  servicoId: uuid('servico_id').references(() => servicos.id, { onDelete: 'restrict' }),
  /** Nome copiado no lançamento: renomear no catálogo não altera orçamento antigo. */
  descricao: text('descricao').notNull(),
  quantidade: numeric('quantidade', { precision: 12, scale: 3 }).notNull(),
  precoUnitarioCentavos: integer('preco_unitario_centavos').notNull(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

export const osFotos = pgTable('os_fotos', {
  id: uuid('id').primaryKey().defaultRandom(),
  osId: uuid('os_id')
    .notNull()
    .references(() => ordensServico.id, { onDelete: 'cascade' }),
  momento: momentoFoto('momento').notNull().default('chegada'),
  caminhoArquivo: text('caminho_arquivo').notNull(),
  nomeOriginal: text('nome_original'),
  tamanhoBytes: integer('tamanho_bytes'),
  legenda: text('legenda'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

export const osHistorico = pgTable('os_historico', {
  id: uuid('id').primaryKey().defaultRandom(),
  osId: uuid('os_id')
    .notNull()
    .references(() => ordensServico.id, { onDelete: 'cascade' }),
  situacaoAnterior: situacaoOs('situacao_anterior'),
  situacaoNova: situacaoOs('situacao_nova').notNull(),
  observacao: text('observacao'),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

export const osOrcamentoVersoes = pgTable(
  'os_orcamento_versoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    osId: uuid('os_id')
      .notNull()
      .references(() => ordensServico.id, { onDelete: 'cascade' }),
    versao: integer('versao').notNull(),
    totalCentavos: integer('total_centavos').notNull(),
    /** Cópia dos itens no momento do envio, para reproduzir o que o cliente viu. */
    itens: jsonb('itens').notNull(),
    enviadoEm: timestamp('enviado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabela) => [uniqueIndex('os_orcamento_versao_unica').on(tabela.osId, tabela.versao)],
)

/** Contador por ano, travado por linha na transação que cria a OS. */
export const osNumeracao = pgTable('os_numeracao', {
  ano: integer('ano').primaryKey(),
  ultimoNumero: integer('ultimo_numero').notNull().default(0),
})
```

- [ ] **Step 4: Escrever `src/db/schema/estoque.ts`**

```ts
import {
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { fornecedores, pecas } from './catalogo'
import { ordensServico } from './os'
import { usuarios } from './usuarios'

export const tipoMovimento = pgEnum('tipo_movimento', [
  'entrada_compra',
  'saida_os',
  'estorno_os',
  'ajuste',
])

export const estoqueMovimentos = pgTable('estoque_movimentos', {
  id: uuid('id').primaryKey().defaultRandom(),
  pecaId: uuid('peca_id')
    .notNull()
    .references(() => pecas.id, { onDelete: 'restrict' }),
  tipo: tipoMovimento('tipo').notNull(),
  /** Com sinal: entrada positiva, saída negativa. Saldo é a soma. */
  quantidade: numeric('quantidade', { precision: 12, scale: 3 }).notNull(),
  referenciaTipo: text('referencia_tipo'),
  referenciaId: uuid('referencia_id'),
  motivo: text('motivo'),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

export const compras = pgTable('compras', {
  id: uuid('id').primaryKey().defaultRandom(),
  fornecedorId: uuid('fornecedor_id').references(() => fornecedores.id, {
    onDelete: 'restrict',
  }),
  /** A OS que motivou a compra, quando a peça foi comprada sob demanda. */
  osId: uuid('os_id').references(() => ordensServico.id, { onDelete: 'set null' }),
  data: date('data').notNull(),
  numeroDocumento: text('numero_documento'),
  observacoes: text('observacoes'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

export const compraItens = pgTable('compra_itens', {
  id: uuid('id').primaryKey().defaultRandom(),
  compraId: uuid('compra_id')
    .notNull()
    .references(() => compras.id, { onDelete: 'cascade' }),
  pecaId: uuid('peca_id')
    .notNull()
    .references(() => pecas.id, { onDelete: 'restrict' }),
  quantidade: numeric('quantidade', { precision: 12, scale: 3 }).notNull(),
  custoUnitarioCentavos: integer('custo_unitario_centavos').notNull(),
})
```

Acrescentar a `src/db/schema/index.ts`: `export * from './os'` e `export * from './estoque'`.

- [ ] **Step 5: Migrar, rodar e commitar**

```bash
npm run banco:gerar && npm run banco:aplicar
npx vitest run testes/integracao/schema-os.test.ts
git add -A && git commit -m "Adiciona schema de ordens de servico, estoque e compras"
```
Expected: PASS, 7 testes.

---

### Task 2: Máquina de situações

O coração da regra. Função pura, sem banco — por isso é a mais barata de testar exaustivamente e a mais cara de errar.

**Files:**
- Create: `src/modulos/os/situacoes.ts`
- Test: `testes/unidade/situacoes.test.ts`

**Interfaces:**
- Produces:
  - `type SituacaoOs` (as 11 situações)
  - `SITUACOES: Record<SituacaoOs, string>` — rótulos para tela
  - `TRANSICOES: Record<SituacaoOs, SituacaoOs[]>`
  - `transicaoPermitida(de: SituacaoOs, para: SituacaoOs): boolean`
  - `eTerminal(situacao: SituacaoOs): boolean`
  - `aceitaAlteracaoDeItem(situacao: SituacaoOs): boolean`
  - `proximaAcao(situacao: SituacaoOs): { rotulo: string; para: SituacaoOs } | null`

- [ ] **Step 1: Escrever o teste que falha**

`testes/unidade/situacoes.test.ts`:

```ts
import { expect, test } from 'vitest'
import {
  SITUACOES,
  TRANSICOES,
  aceitaAlteracaoDeItem,
  eTerminal,
  proximaAcao,
  transicaoPermitida,
  type SituacaoOs,
} from '../../src/modulos/os/situacoes'

test('o caminho feliz inteiro é permitido', () => {
  const caminho: SituacaoOs[] = [
    'recebido',
    'em_diagnostico',
    'orcamento_enviado',
    'aprovado',
    'em_execucao',
    'pronto',
    'entregue',
  ]
  for (let i = 0; i < caminho.length - 1; i++) {
    expect(transicaoPermitida(caminho[i], caminho[i + 1])).toBe(true)
  }
})

test('espera por peça vai e volta da execução', () => {
  expect(transicaoPermitida('aguardando_peca', 'em_execucao')).toBe(true)
  expect(transicaoPermitida('em_execucao', 'aguardando_peca')).toBe(true)
})

test('revisão de orçamento é permitida depois da aprovação', () => {
  expect(transicaoPermitida('aprovado', 'orcamento_enviado')).toBe(true)
  expect(transicaoPermitida('aguardando_peca', 'orcamento_enviado')).toBe(true)
  expect(transicaoPermitida('em_execucao', 'orcamento_enviado')).toBe(true)
})

test('OS pronta pode ser reaberta para execução', () => {
  expect(transicaoPermitida('pronto', 'em_execucao')).toBe(true)
})

test('recusa leva a devolução', () => {
  expect(transicaoPermitida('orcamento_enviado', 'recusado')).toBe(true)
  expect(transicaoPermitida('recusado', 'devolvido')).toBe(true)
})

test('pular etapa é recusado', () => {
  expect(transicaoPermitida('recebido', 'pronto')).toBe(false)
  expect(transicaoPermitida('recebido', 'entregue')).toBe(false)
  expect(transicaoPermitida('em_diagnostico', 'aprovado')).toBe(false)
  expect(transicaoPermitida('orcamento_enviado', 'em_execucao')).toBe(false)
})

test('situação terminal não vai a lugar nenhum', () => {
  for (const terminal of ['entregue', 'devolvido', 'cancelado'] as SituacaoOs[]) {
    expect(eTerminal(terminal)).toBe(true)
    expect(TRANSICOES[terminal]).toEqual([])
  }
})

test('cancelamento só antes da execução', () => {
  expect(transicaoPermitida('recebido', 'cancelado')).toBe(true)
  expect(transicaoPermitida('em_diagnostico', 'cancelado')).toBe(true)
  expect(transicaoPermitida('aprovado', 'cancelado')).toBe(true)
  expect(transicaoPermitida('pronto', 'cancelado')).toBe(false)
  expect(transicaoPermitida('entregue', 'cancelado')).toBe(false)
})

test('OS encerrada não aceita alteração de item', () => {
  expect(aceitaAlteracaoDeItem('em_diagnostico')).toBe(true)
  expect(aceitaAlteracaoDeItem('em_execucao')).toBe(true)
  expect(aceitaAlteracaoDeItem('recusado')).toBe(true)
  expect(aceitaAlteracaoDeItem('entregue')).toBe(false)
  expect(aceitaAlteracaoDeItem('devolvido')).toBe(false)
  expect(aceitaAlteracaoDeItem('cancelado')).toBe(false)
})

test('a próxima ação acompanha a situação', () => {
  expect(proximaAcao('recebido')).toEqual({
    rotulo: 'Iniciar diagnóstico',
    para: 'em_diagnostico',
  })
  expect(proximaAcao('orcamento_enviado')).toEqual({
    rotulo: 'Registrar aprovação',
    para: 'aprovado',
  })
  expect(proximaAcao('pronto')).toEqual({ rotulo: 'Entregar', para: 'entregue' })
  expect(proximaAcao('entregue')).toBeNull()
})

test('toda situação tem rótulo legível', () => {
  for (const situacao of Object.keys(TRANSICOES) as SituacaoOs[]) {
    expect(SITUACOES[situacao]).toBeTruthy()
  }
})
```

- [ ] **Step 2: Rodar, ver falhar, implementar `situacoes.ts`**

```ts
export const SITUACOES = {
  recebido: 'Recebido',
  em_diagnostico: 'Em diagnóstico',
  orcamento_enviado: 'Orçamento enviado',
  aprovado: 'Aprovado',
  aguardando_peca: 'Aguardando peça',
  em_execucao: 'Em execução',
  pronto: 'Pronto',
  entregue: 'Entregue',
  recusado: 'Recusado',
  devolvido: 'Devolvido',
  cancelado: 'Cancelado',
} as const

export type SituacaoOs = keyof typeof SITUACOES

/** Única fonte de verdade do fluxo. Qualquer salto fora daqui é recusado. */
export const TRANSICOES: Record<SituacaoOs, SituacaoOs[]> = {
  recebido: ['em_diagnostico', 'cancelado'],
  em_diagnostico: ['orcamento_enviado', 'cancelado'],
  orcamento_enviado: ['aprovado', 'recusado', 'orcamento_enviado'],
  aprovado: ['aguardando_peca', 'em_execucao', 'orcamento_enviado', 'cancelado'],
  aguardando_peca: ['em_execucao', 'orcamento_enviado'],
  em_execucao: ['aguardando_peca', 'pronto', 'orcamento_enviado'],
  pronto: ['entregue', 'em_execucao'],
  recusado: ['devolvido'],
  entregue: [],
  devolvido: [],
  cancelado: [],
}

export function transicaoPermitida(de: SituacaoOs, para: SituacaoOs): boolean {
  return TRANSICOES[de].includes(para)
}

export function eTerminal(situacao: SituacaoOs): boolean {
  return TRANSICOES[situacao].length === 0
}

/** OS encerrada não recebe item novo — nem para "acertar" o valor na entrega. */
export function aceitaAlteracaoDeItem(situacao: SituacaoOs): boolean {
  return !eTerminal(situacao)
}

const PROXIMA: Partial<Record<SituacaoOs, { rotulo: string; para: SituacaoOs }>> = {
  recebido: { rotulo: 'Iniciar diagnóstico', para: 'em_diagnostico' },
  em_diagnostico: { rotulo: 'Enviar orçamento', para: 'orcamento_enviado' },
  orcamento_enviado: { rotulo: 'Registrar aprovação', para: 'aprovado' },
  aprovado: { rotulo: 'Iniciar execução', para: 'em_execucao' },
  aguardando_peca: { rotulo: 'Retomar execução', para: 'em_execucao' },
  em_execucao: { rotulo: 'Concluir serviço', para: 'pronto' },
  pronto: { rotulo: 'Entregar', para: 'entregue' },
  recusado: { rotulo: 'Devolver equipamento', para: 'devolvido' },
}

/** O botão de próxima ação da ficha da OS. */
export function proximaAcao(
  situacao: SituacaoOs,
): { rotulo: string; para: SituacaoOs } | null {
  return PROXIMA[situacao] ?? null
}
```

- [ ] **Step 3: Rodar e commitar**

Run: `npx vitest run testes/unidade/situacoes.test.ts`
Expected: PASS, 10 testes.

---

### Task 3: Totais da OS

**Files:**
- Create: `src/modulos/os/totais.ts`
- Test: `testes/unidade/totais.test.ts`

**Interfaces:**
- Produces:
  - `type ItemParaTotal = { tipo: 'peca' | 'servico'; quantidade: string | number; precoUnitarioCentavos: number }`
  - `type TotaisOs = { pecasCentavos: number; servicosCentavos: number; subtotalCentavos: number; descontoCentavos: number; totalCentavos: number }`
  - `calcularTotais(itens: ItemParaTotal[], descontoCentavos?: number): TotaisOs`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { expect, test } from 'vitest'
import { calcularTotais } from '../../src/modulos/os/totais'

const peca = (quantidade: string, preco: number) => ({
  tipo: 'peca' as const,
  quantidade,
  precoUnitarioCentavos: preco,
})
const servico = (quantidade: string, preco: number) => ({
  tipo: 'servico' as const,
  quantidade,
  precoUnitarioCentavos: preco,
})

test('separa peças de serviços e soma o total', () => {
  const totais = calcularTotais([peca('1', 23000), peca('1', 6200), servico('1', 21000)])

  expect(totais.pecasCentavos).toBe(29200)
  expect(totais.servicosCentavos).toBe(21000)
  expect(totais.totalCentavos).toBe(50200)
})

test('multiplica pela quantidade, inclusive fracionada', () => {
  // 0,5 L a R$ 38,00 = R$ 19,00
  expect(calcularTotais([peca('0.5', 3800)]).totalCentavos).toBe(1900)
  expect(calcularTotais([peca('3', 1800)]).totalCentavos).toBe(5400)
})

test('arredonda o centavo em vez de deixar fração', () => {
  // 0,333 × R$ 10,00 = R$ 3,33
  expect(calcularTotais([peca('0.333', 1000)]).totalCentavos).toBe(333)
})

test('aplica o desconto sobre o subtotal', () => {
  const totais = calcularTotais([servico('1', 21000)], 1000)

  expect(totais.subtotalCentavos).toBe(21000)
  expect(totais.descontoCentavos).toBe(1000)
  expect(totais.totalCentavos).toBe(20000)
})

test('desconto maior que o subtotal não gera total negativo', () => {
  expect(calcularTotais([servico('1', 5000)], 9000).totalCentavos).toBe(0)
})

test('lista vazia soma zero', () => {
  expect(calcularTotais([])).toEqual({
    pecasCentavos: 0,
    servicosCentavos: 0,
    subtotalCentavos: 0,
    descontoCentavos: 0,
    totalCentavos: 0,
  })
})
```

- [ ] **Step 2: Implementar `totais.ts`**

```ts
export type ItemParaTotal = {
  tipo: 'peca' | 'servico'
  quantidade: string | number
  precoUnitarioCentavos: number
}

export type TotaisOs = {
  pecasCentavos: number
  servicosCentavos: number
  subtotalCentavos: number
  descontoCentavos: number
  totalCentavos: number
}

/** Quantidade vem do banco como texto (`numeric`); converter aqui, uma vez só. */
function totalDoItem(item: ItemParaTotal): number {
  const quantidade = Number(item.quantidade)
  return Math.round(quantidade * item.precoUnitarioCentavos)
}

export function calcularTotais(
  itens: ItemParaTotal[],
  descontoCentavos = 0,
): TotaisOs {
  let pecasCentavos = 0
  let servicosCentavos = 0

  for (const item of itens) {
    if (item.tipo === 'peca') pecasCentavos += totalDoItem(item)
    else servicosCentavos += totalDoItem(item)
  }

  const subtotalCentavos = pecasCentavos + servicosCentavos
  // Desconto nunca empurra o total abaixo de zero: isso viraria crédito, que
  // não existe no modelo.
  const totalCentavos = Math.max(0, subtotalCentavos - descontoCentavos)

  return {
    pecasCentavos,
    servicosCentavos,
    subtotalCentavos,
    descontoCentavos,
    totalCentavos,
  }
}
```

- [ ] **Step 3: Rodar e commitar**

Run: `npx vitest run testes/unidade/totais.test.ts`
Expected: PASS, 6 testes.

---

### Task 4: Estoque — razão, saldo e ajuste

**Files:**
- Create: `src/modulos/estoque/consultas.ts`, `src/modulos/estoque/operacoes.ts`
- Test: `testes/integracao/estoque.test.ts`

**Interfaces:**
- Produces:
  - `registrarMovimento(entrada: { pecaId; tipo; quantidade: number; referenciaTipo?; referenciaId?; motivo?; usuarioId? }, tx?): Promise<void>`
  - `saldoDaPeca(pecaId: string): Promise<number>`
  - `type SaldoPeca = { id; nome; marca; unidade; controlaSaldo; quantidadeMinima: number; saldo: number; abaixoDoMinimo: boolean }`
  - `listarSaldos(): Promise<SaldoPeca[]>`
  - `listarReposicao(): Promise<SaldoPeca[]>`
  - `listarMovimentosDaPeca(pecaId: string): Promise<…>`
  - `ajustarEstoque(entrada: { pecaId: string; quantidade: number; motivo: string }): Promise<Resultado<null>>`

Regras cobertas por teste: saldo é a soma dos movimentos; saldo negativo é permitido; ajuste exige motivo; ajuste aceita quantidade negativa; `listarReposicao` traz só peça com `controlaSaldo` e saldo ≤ mínimo; peça sem movimento tem saldo zero.

- [ ] **Step 1: Escrever `testes/integracao/estoque.test.ts`**

```ts
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { pecas } from '../../src/db/schema'
import {
  listarReposicao,
  listarSaldos,
  saldoDaPeca,
} from '../../src/modulos/estoque/consultas'
import { ajustarEstoque, registrarMovimento } from '../../src/modulos/estoque/operacoes'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

async function novaPeca(extra: Record<string, unknown> = {}) {
  const [peca] = await db
    .insert(pecas)
    .values({ nome: 'Óleo 2T', controlaSaldo: true, quantidadeMinima: '2', ...extra })
    .returning()
  return peca
}

test('peça sem movimento tem saldo zero', async () => {
  const peca = await novaPeca()
  expect(await saldoDaPeca(peca.id)).toBe(0)
})

test('o saldo é a soma dos movimentos', async () => {
  const peca = await novaPeca()
  await registrarMovimento({ pecaId: peca.id, tipo: 'entrada_compra', quantidade: 10 })
  await registrarMovimento({ pecaId: peca.id, tipo: 'saida_os', quantidade: -3 })
  await registrarMovimento({ pecaId: peca.id, tipo: 'saida_os', quantidade: -1.5 })

  expect(await saldoDaPeca(peca.id)).toBe(5.5)
})

test('saldo negativo é permitido, não bloqueado', async () => {
  const peca = await novaPeca()
  await registrarMovimento({ pecaId: peca.id, tipo: 'saida_os', quantidade: -2 })

  expect(await saldoDaPeca(peca.id)).toBe(-2)
})

test('ajuste exige motivo', async () => {
  const peca = await novaPeca()

  const r = await ajustarEstoque({ pecaId: peca.id, quantidade: 5, motivo: '  ' })

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Informe o motivo do ajuste.')
  expect(await saldoDaPeca(peca.id)).toBe(0)
})

test('ajuste move o saldo nos dois sentidos', async () => {
  const peca = await novaPeca()

  await ajustarEstoque({ pecaId: peca.id, quantidade: 8, motivo: 'Inventário inicial' })
  await ajustarEstoque({ pecaId: peca.id, quantidade: -3, motivo: 'Perda' })

  expect(await saldoDaPeca(peca.id)).toBe(5)
})

test('ajuste de quantidade zero é recusado', async () => {
  const peca = await novaPeca()

  const r = await ajustarEstoque({ pecaId: peca.id, quantidade: 0, motivo: 'Nada' })

  expect(r.ok).toBe(false)
})

test('a reposição traz só quem controla saldo e está no mínimo ou abaixo', async () => {
  const oleo = await novaPeca({ nome: 'Óleo 2T', quantidadeMinima: '2' })
  const vela = await novaPeca({ nome: 'Vela NGK', quantidadeMinima: '5' })
  const kit = await novaPeca({ nome: 'Kit cilindro', controlaSaldo: false })

  await registrarMovimento({ pecaId: oleo.id, tipo: 'entrada_compra', quantidade: 10 })
  await registrarMovimento({ pecaId: vela.id, tipo: 'entrada_compra', quantidade: 5 })
  await registrarMovimento({ pecaId: kit.id, tipo: 'saida_os', quantidade: -4 })

  const reposicao = await listarReposicao()

  // Óleo tem 10 (acima de 2), Vela tem 5 (igual ao mínimo, entra),
  // Kit não controla saldo mesmo estando negativo.
  expect(reposicao.map((p) => p.nome)).toEqual(['Vela NGK'])
})

test('a lista de saldos marca quem está abaixo do mínimo', async () => {
  const peca = await novaPeca({ quantidadeMinima: '4' })
  await registrarMovimento({ pecaId: peca.id, tipo: 'entrada_compra', quantidade: 1 })

  const [saldo] = await listarSaldos()

  expect(saldo.saldo).toBe(1)
  expect(saldo.abaixoDoMinimo).toBe(true)
})
```

- [ ] **Step 2: Implementar `operacoes.ts`**

```ts
import { db } from '@/db'
import { estoqueMovimentos } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'

type Transacao = Parameters<Parameters<typeof db.transaction>[0]>[0]

export type EntradaMovimento = {
  pecaId: string
  tipo: 'entrada_compra' | 'saida_os' | 'estorno_os' | 'ajuste'
  quantidade: number
  referenciaTipo?: string
  referenciaId?: string
  motivo?: string
  usuarioId?: string
}

/**
 * Grava no razão. Aceita transação para que baixa de estoque e mudança de
 * situação da OS aconteçam juntas ou não aconteçam.
 */
export async function registrarMovimento(
  entrada: EntradaMovimento,
  tx?: Transacao,
): Promise<void> {
  const executor = tx ?? db
  await executor.insert(estoqueMovimentos).values({
    pecaId: entrada.pecaId,
    tipo: entrada.tipo,
    quantidade: entrada.quantidade.toFixed(3),
    referenciaTipo: entrada.referenciaTipo ?? null,
    referenciaId: entrada.referenciaId ?? null,
    motivo: entrada.motivo ?? null,
    usuarioId: entrada.usuarioId ?? null,
  })
}

export async function ajustarEstoque(entrada: {
  pecaId: string
  quantidade: number
  motivo: string
}): Promise<Resultado<null>> {
  // Ajuste sem explicação é como o controle se perde de novo.
  if (!entrada.motivo?.trim()) return falha('Informe o motivo do ajuste.')
  if (!Number.isFinite(entrada.quantidade) || entrada.quantidade === 0) {
    return falha('Informe uma quantidade diferente de zero.')
  }

  await registrarMovimento({
    pecaId: entrada.pecaId,
    tipo: 'ajuste',
    quantidade: entrada.quantidade,
    motivo: entrada.motivo.trim(),
  })
  return sucesso(null)
}
```

- [ ] **Step 3: Implementar `consultas.ts`**

```ts
import { asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { estoqueMovimentos, pecas } from '@/db/schema'

export type SaldoPeca = {
  id: string
  nome: string
  marca: string | null
  unidade: string
  controlaSaldo: boolean
  quantidadeMinima: number
  saldo: number
  abaixoDoMinimo: boolean
}

const SOMA_SALDO = sql<string>`coalesce(sum(${estoqueMovimentos.quantidade}), 0)`

export async function saldoDaPeca(pecaId: string): Promise<number> {
  const [linha] = await db
    .select({ saldo: SOMA_SALDO })
    .from(estoqueMovimentos)
    .where(eq(estoqueMovimentos.pecaId, pecaId))
  return Number(linha?.saldo ?? 0)
}

export async function listarSaldos(): Promise<SaldoPeca[]> {
  const linhas = await db
    .select({
      id: pecas.id,
      nome: pecas.nome,
      marca: pecas.marca,
      unidade: pecas.unidade,
      controlaSaldo: pecas.controlaSaldo,
      quantidadeMinima: pecas.quantidadeMinima,
      saldo: SOMA_SALDO,
    })
    .from(pecas)
    .leftJoin(estoqueMovimentos, eq(estoqueMovimentos.pecaId, pecas.id))
    .where(eq(pecas.ativo, true))
    .groupBy(pecas.id)
    .orderBy(asc(pecas.nome))

  return linhas.map((linha) => {
    const saldo = Number(linha.saldo)
    const minimo = Number(linha.quantidadeMinima)
    return {
      ...linha,
      quantidadeMinima: minimo,
      saldo,
      abaixoDoMinimo: linha.controlaSaldo && saldo <= minimo,
    }
  })
}

/** Peça que controla saldo e chegou ao mínimo. Consulta, não notificação. */
export async function listarReposicao(): Promise<SaldoPeca[]> {
  return (await listarSaldos()).filter((peca) => peca.abaixoDoMinimo)
}

export async function listarMovimentosDaPeca(pecaId: string) {
  return db
    .select()
    .from(estoqueMovimentos)
    .where(eq(estoqueMovimentos.pecaId, pecaId))
    .orderBy(desc(estoqueMovimentos.criadoEm))
}
```

- [ ] **Step 4: Rodar e commitar**

Run: `npx vitest run testes/integracao/estoque.test.ts`
Expected: PASS, 8 testes.

---

### Task 5: OS — criação com numeração, consultas e itens

**Files:**
- Create: `src/modulos/os/esquemas.ts`, `src/modulos/os/consultas.ts`, `src/modulos/os/operacoes.ts`
- Test: `testes/integracao/os-criacao.test.ts`, `testes/integracao/os-itens.test.ts`

**Interfaces:**
- Produces:
  - `entradaOs`, `entradaItemOs` (Zod)
  - `criarOs(entrada): Promise<Resultado<{ id: string; numero: string }>>`
  - `obterOs(id): Promise<OsCompleta | null>` — OS + cliente + equipamento + itens + totais
  - `listarOs(filtro: { busca?; situacoes?; de?; ate? }): Promise<OsResumo[]>`
  - `adicionarItem(osId, entrada): Promise<Resultado<{ id: string }>>`
  - `removerItem(itemId): Promise<Resultado<null>>`
  - `definirDesconto(osId, centavos): Promise<Resultado<null>>`
  - `atualizarDiagnostico(osId, texto): Promise<Resultado<null>>`

Regras cobertas por teste: numeração sequencial por ano (`2026-0001`, `2026-0002`) sem furo, mesmo com criação concorrente; item copia a descrição e o preço do catálogo no momento do lançamento; renomear o serviço no catálogo depois não altera o item; item em OS terminal é recusado; remover item de OS terminal é recusado; totais da OS batem com `calcularTotais`.

- [ ] **Step 1: Escrever `testes/integracao/os-criacao.test.ts`**

```ts
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { clientes, equipamentos, ordensServico, servicos } from '../../src/db/schema'
import { listarOs, obterOs } from '../../src/modulos/os/consultas'
import { criarOs } from '../../src/modulos/os/operacoes'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

async function cenario() {
  const [cliente] = await db.insert(clientes).values({ nome: 'Marcos Andrade' }).returning()
  const [equipamento] = await db
    .insert(equipamentos)
    .values({
      clienteId: cliente.id,
      tipoMotor: '2T',
      aplicacao: 'rocadeira',
      marca: 'Stihl',
      modelo: 'FS 220',
    })
    .returning()
  const [servico] = await db
    .insert(servicos)
    .values({ nome: 'Limpeza de carburador', precoPadraoCentavos: 6200 })
    .returning()
  return { cliente, equipamento, servico }
}

test('a primeira OS do ano recebe o número 0001', async () => {
  const { cliente, equipamento } = await cenario()

  const r = await criarOs({
    clienteId: cliente.id,
    equipamentoId: equipamento.id,
    problemaRelatado: 'Não pega a frio',
    acessoriosRecebidos: null,
    observacoes: null,
  })

  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect(r.dados.numero).toMatch(/^\d{4}-0001$/)
})

test('a numeração é sequencial e sem furo', async () => {
  const { cliente, equipamento } = await cenario()
  const entrada = {
    clienteId: cliente.id,
    equipamentoId: equipamento.id,
    problemaRelatado: null,
    acessoriosRecebidos: null,
    observacoes: null,
  }

  const numeros: string[] = []
  for (let i = 0; i < 3; i++) {
    const r = await criarOs(entrada)
    if (!r.ok) throw new Error('criação falhou')
    numeros.push(r.dados.numero)
  }

  const sufixos = numeros.map((n) => n.split('-')[1])
  expect(sufixos).toEqual(['0001', '0002', '0003'])
})

test('criações concorrentes não repetem número', async () => {
  const { cliente, equipamento } = await cenario()
  const entrada = {
    clienteId: cliente.id,
    equipamentoId: equipamento.id,
    problemaRelatado: null,
    acessoriosRecebidos: null,
    observacoes: null,
  }

  const resultados = await Promise.all([criarOs(entrada), criarOs(entrada), criarOs(entrada)])

  const numeros = resultados.filter((r) => r.ok).map((r) => (r.ok ? r.dados.numero : ''))
  expect(new Set(numeros).size).toBe(3)
})

test('a OS nasce recebida e com histórico registrado', async () => {
  const { cliente, equipamento } = await cenario()
  const r = await criarOs({
    clienteId: cliente.id,
    equipamentoId: equipamento.id,
    problemaRelatado: 'Perde força',
    acessoriosRecebidos: 'Chave e alça',
    observacoes: null,
  })
  if (!r.ok) throw new Error('criação falhou')

  const os = await obterOs(r.dados.id)

  expect(os?.situacao).toBe('recebido')
  expect(os?.problemaRelatado).toBe('Perde força')
  expect(os?.historico).toHaveLength(1)
  expect(os?.historico[0].situacaoNova).toBe('recebido')
})

test('recusa OS com cliente ou equipamento inexistente', async () => {
  const { equipamento } = await cenario()

  const r = await criarOs({
    clienteId: '00000000-0000-0000-0000-000000000000',
    equipamentoId: equipamento.id,
    problemaRelatado: null,
    acessoriosRecebidos: null,
    observacoes: null,
  })

  expect(r.ok).toBe(false)
})

test('a lista traz cliente, equipamento e total, e filtra por situação', async () => {
  const { cliente, equipamento } = await cenario()
  const r = await criarOs({
    clienteId: cliente.id,
    equipamentoId: equipamento.id,
    problemaRelatado: null,
    acessoriosRecebidos: null,
    observacoes: null,
  })
  if (!r.ok) throw new Error('criação falhou')

  const [linha] = await listarOs({})

  expect(linha.clienteNome).toBe('Marcos Andrade')
  expect(linha.equipamentoDescricao).toBe('Roçadeira Stihl FS 220 (2T)')
  expect(linha.totalCentavos).toBe(0)
  expect(await listarOs({ situacoes: ['recebido'] })).toHaveLength(1)
  expect(await listarOs({ situacoes: ['entregue'] })).toHaveLength(0)
})

test('a busca encontra por número, cliente e equipamento', async () => {
  const { cliente, equipamento } = await cenario()
  const r = await criarOs({
    clienteId: cliente.id,
    equipamentoId: equipamento.id,
    problemaRelatado: null,
    acessoriosRecebidos: null,
    observacoes: null,
  })
  if (!r.ok) throw new Error('criação falhou')

  expect(await listarOs({ busca: r.dados.numero })).toHaveLength(1)
  expect(await listarOs({ busca: 'andrade' })).toHaveLength(1)
  expect(await listarOs({ busca: 'stihl' })).toHaveLength(1)
  expect(await listarOs({ busca: 'inexistente' })).toHaveLength(0)
})
```

- [ ] **Step 2: Escrever `testes/integracao/os-itens.test.ts`**

Cobre a cópia de descrição e preço, o congelamento contra renomeação no catálogo, o cálculo de totais e a recusa em OS terminal.

```ts
import { eq } from 'drizzle-orm'
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { clientes, equipamentos, ordensServico, pecas, servicos } from '../../src/db/schema'
import { obterOs } from '../../src/modulos/os/consultas'
import { adicionarItem, criarOs, definirDesconto, removerItem } from '../../src/modulos/os/operacoes'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

async function cenario() {
  const [cliente] = await db.insert(clientes).values({ nome: 'Marcos' }).returning()
  const [equipamento] = await db
    .insert(equipamentos)
    .values({ clienteId: cliente.id, tipoMotor: '2T', aplicacao: 'rocadeira' })
    .returning()
  const [servico] = await db
    .insert(servicos)
    .values({ nome: 'Retífica de cilindro', precoPadraoCentavos: 21000 })
    .returning()
  const [peca] = await db
    .insert(pecas)
    .values({ nome: 'Óleo 2T', unidade: 'L', precoVendaCentavos: 3800 })
    .returning()
  const r = await criarOs({
    clienteId: cliente.id,
    equipamentoId: equipamento.id,
    problemaRelatado: null,
    acessoriosRecebidos: null,
    observacoes: null,
  })
  if (!r.ok) throw new Error('criação falhou')
  return { osId: r.dados.id, servico, peca }
}

test('o item copia nome e preço do catálogo no lançamento', async () => {
  const { osId, servico } = await cenario()

  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })

  const os = await obterOs(osId)
  expect(os?.itens[0].descricao).toBe('Retífica de cilindro')
  expect(os?.itens[0].precoUnitarioCentavos).toBe(21000)
})

test('renomear no catálogo não altera item já lançado', async () => {
  const { osId, servico } = await cenario()
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })

  await db
    .update(servicos)
    .set({ nome: 'Retífica completa', precoPadraoCentavos: 30000 })
    .where(eq(servicos.id, servico.id))

  const os = await obterOs(osId)
  expect(os?.itens[0].descricao).toBe('Retífica de cilindro')
  expect(os?.itens[0].precoUnitarioCentavos).toBe(21000)
})

test('preço informado tem precedência sobre o do catálogo', async () => {
  const { osId, servico } = await cenario()

  await adicionarItem(osId, {
    tipo: 'servico',
    referenciaId: servico.id,
    quantidade: 1,
    precoUnitarioCentavos: 18000,
  })

  expect((await obterOs(osId))?.itens[0].precoUnitarioCentavos).toBe(18000)
})

test('os totais separam peça de serviço e aplicam desconto', async () => {
  const { osId, servico, peca } = await cenario()
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })
  await adicionarItem(osId, { tipo: 'peca', referenciaId: peca.id, quantidade: 0.5 })

  await definirDesconto(osId, 1000)

  const os = await obterOs(osId)
  expect(os?.totais.servicosCentavos).toBe(21000)
  expect(os?.totais.pecasCentavos).toBe(1900)
  expect(os?.totais.totalCentavos).toBe(21900)
})

test('remover item recalcula o total', async () => {
  const { osId, servico } = await cenario()
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })
  const os = await obterOs(osId)

  await removerItem(os!.itens[0].id)

  expect((await obterOs(osId))?.totais.totalCentavos).toBe(0)
})

test('OS entregue não aceita item novo', async () => {
  const { osId, servico } = await cenario()
  await db
    .update(ordensServico)
    .set({ situacao: 'entregue' })
    .where(eq(ordensServico.id, osId))

  const r = await adicionarItem(osId, {
    tipo: 'servico',
    referenciaId: servico.id,
    quantidade: 1,
  })

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Esta ordem de serviço está encerrada e não aceita alteração de itens.')
})

test('quantidade zero ou negativa é recusada', async () => {
  const { osId, servico } = await cenario()

  const zero = await adicionarItem(osId, {
    tipo: 'servico',
    referenciaId: servico.id,
    quantidade: 0,
  })
  const negativa = await adicionarItem(osId, {
    tipo: 'servico',
    referenciaId: servico.id,
    quantidade: -1,
  })

  expect(zero.ok).toBe(false)
  expect(negativa.ok).toBe(false)
})
```

- [ ] **Step 3: Implementar `esquemas.ts`, `operacoes.ts` e `consultas.ts`**

Numeração — o ponto delicado. Dentro da transação:

```ts
const ano = new Date().getFullYear()
const [linha] = await tx
  .insert(osNumeracao)
  .values({ ano, ultimoNumero: 1 })
  .onConflictDoUpdate({
    target: osNumeracao.ano,
    set: { ultimoNumero: sql`${osNumeracao.ultimoNumero} + 1` },
  })
  .returning({ ultimoNumero: osNumeracao.ultimoNumero })

const numero = `${ano}-${String(linha.ultimoNumero).padStart(4, '0')}`
```

`insert … on conflict do update … returning` é atômico: duas transações concorrentes serializam na linha do ano e recebem números distintos. É o que o teste de concorrência verifica.

`obterOs` devolve OS + cliente + equipamento (com `descreverEquipamento`) + itens + `calcularTotais(itens, desconto)` + histórico ordenado + fotos + versões de orçamento.

`adicionarItem` busca nome e preço no catálogo conforme `tipo`, valida `aceitaAlteracaoDeItem(os.situacao)` e quantidade positiva.

- [ ] **Step 4: Rodar e commitar**

Run: `npx vitest run testes/integracao/os-criacao.test.ts testes/integracao/os-itens.test.ts`
Expected: PASS, 14 testes.

---

### Task 6: Transições, histórico, versões de orçamento e baixa de estoque

A tarefa mais importante do plano. Tudo transacional.

**Files:**
- Modify: `src/modulos/os/operacoes.ts`
- Test: `testes/integracao/os-transicoes.test.ts`, `testes/integracao/os-estoque.test.ts`

**Interfaces:**
- Produces:
  - `mudarSituacao(osId, para: SituacaoOs, opcoes?: { observacao?; motivo?; usuarioId? }): Promise<Resultado<null>>`

Regras cobertas por teste:

1. Transição válida grava histórico e carimba a data da etapa
2. Transição inválida é recusada com mensagem que nomeia as duas situações, e nada muda
3. Enviar orçamento incrementa `versaoOrcamento` e grava `os_orcamento_versoes` com os itens
4. Reenviar sem alterar item **não** cria versão nova, mas registra no histórico
5. Alterar item depois de aprovado e reenviar cria a versão 2, preservando a 1
6. Ir para `pronto` baixa do estoque exatamente os itens de peça
7. Reabrir de `pronto` para `em_execucao` estorna os movimentos daquela OS
8. Reabrir e concluir de novo baixa a lista corrente, não a antiga
9. Item de serviço não gera movimento de estoque
10. Falha no meio não deixa estado parcial (transação)

- [ ] **Step 1: Escrever `testes/integracao/os-transicoes.test.ts`**

```ts
import { beforeEach, expect, test } from 'vitest'
import { obterOs } from '../../src/modulos/os/consultas'
import { adicionarItem, mudarSituacao } from '../../src/modulos/os/operacoes'
import { cenarioOs } from '../ajuda/os'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

test('transição válida grava histórico e carimba a data', async () => {
  const { osId } = await cenarioOs()

  const r = await mudarSituacao(osId, 'em_diagnostico', { observacao: 'Ivan avaliou' })

  expect(r.ok).toBe(true)
  const os = await obterOs(osId)
  expect(os?.situacao).toBe('em_diagnostico')
  expect(os?.diagnosticadoEm).toBeInstanceOf(Date)
  expect(os?.historico.at(-1)).toMatchObject({
    situacaoAnterior: 'recebido',
    situacaoNova: 'em_diagnostico',
    observacao: 'Ivan avaliou',
  })
})

test('pular etapa é recusado e nada muda', async () => {
  const { osId } = await cenarioOs()

  const r = await mudarSituacao(osId, 'pronto')

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Não é possível ir de Recebido para Pronto.')
  const os = await obterOs(osId)
  expect(os?.situacao).toBe('recebido')
  expect(os?.historico).toHaveLength(1)
})

test('enviar orçamento cria a versão 1 com os itens', async () => {
  const { osId, servico } = await cenarioOs()
  await mudarSituacao(osId, 'em_diagnostico')
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })

  await mudarSituacao(osId, 'orcamento_enviado')

  const os = await obterOs(osId)
  expect(os?.versaoOrcamento).toBe(1)
  expect(os?.versoesOrcamento).toHaveLength(1)
  expect(os?.versoesOrcamento[0].totalCentavos).toBe(21000)
})

test('reenviar sem alterar item não cria versão nova', async () => {
  const { osId, servico } = await cenarioOs()
  await mudarSituacao(osId, 'em_diagnostico')
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })
  await mudarSituacao(osId, 'orcamento_enviado')

  await mudarSituacao(osId, 'orcamento_enviado', { observacao: 'Reenviado por WhatsApp' })

  const os = await obterOs(osId)
  expect(os?.versaoOrcamento).toBe(1)
  expect(os?.versoesOrcamento).toHaveLength(1)
  // O reenvio existe no histórico, mesmo sem versão nova.
  expect(os?.historico.at(-1)?.observacao).toBe('Reenviado por WhatsApp')
})

test('alterar item depois de aprovado e reenviar cria a versão 2', async () => {
  const { osId, servico, peca } = await cenarioOs()
  await mudarSituacao(osId, 'em_diagnostico')
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })
  await mudarSituacao(osId, 'orcamento_enviado')
  await mudarSituacao(osId, 'aprovado')

  await adicionarItem(osId, { tipo: 'peca', referenciaId: peca.id, quantidade: 1 })
  await mudarSituacao(osId, 'orcamento_enviado', { observacao: 'Achou cilindro riscado' })

  const os = await obterOs(osId)
  expect(os?.situacao).toBe('orcamento_enviado')
  expect(os?.versaoOrcamento).toBe(2)
  expect(os?.versoesOrcamento).toHaveLength(2)
  expect(os?.versoesOrcamento[0].totalCentavos).toBe(21000)
  expect(os?.versoesOrcamento[1].totalCentavos).toBe(24800)
})

test('recusa registra o motivo e permite devolver', async () => {
  const { osId } = await cenarioOs()
  await mudarSituacao(osId, 'em_diagnostico')
  await mudarSituacao(osId, 'orcamento_enviado')

  await mudarSituacao(osId, 'recusado', { motivo: 'Achou caro' })
  const depoisDaRecusa = await obterOs(osId)
  await mudarSituacao(osId, 'devolvido')

  expect(depoisDaRecusa?.motivoRecusa).toBe('Achou caro')
  expect(depoisDaRecusa?.recusadoEm).toBeInstanceOf(Date)
  expect((await obterOs(osId))?.situacao).toBe('devolvido')
})

test('entregar carimba a data de entrega', async () => {
  const { osId } = await cenarioOs()
  for (const passo of [
    'em_diagnostico',
    'orcamento_enviado',
    'aprovado',
    'em_execucao',
    'pronto',
    'entregue',
  ] as const) {
    const r = await mudarSituacao(osId, passo)
    expect(r.ok).toBe(true)
  }

  expect((await obterOs(osId))?.entregueEm).toBeInstanceOf(Date)
})
```

- [ ] **Step 2: Escrever `testes/integracao/os-estoque.test.ts`**

```ts
import { beforeEach, expect, test } from 'vitest'
import { saldoDaPeca } from '../../src/modulos/estoque/consultas'
import { registrarMovimento } from '../../src/modulos/estoque/operacoes'
import { adicionarItem, mudarSituacao, removerItem } from '../../src/modulos/os/operacoes'
import { obterOs } from '../../src/modulos/os/consultas'
import { cenarioOs } from '../ajuda/os'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

async function ateExecucao(osId: string) {
  await mudarSituacao(osId, 'em_diagnostico')
  await mudarSituacao(osId, 'orcamento_enviado')
  await mudarSituacao(osId, 'aprovado')
  await mudarSituacao(osId, 'em_execucao')
}

test('concluir baixa do estoque exatamente as peças lançadas', async () => {
  const { osId, peca, servico } = await cenarioOs()
  await registrarMovimento({ pecaId: peca.id, tipo: 'entrada_compra', quantidade: 10 })
  await adicionarItem(osId, { tipo: 'peca', referenciaId: peca.id, quantidade: 2 })
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })
  await ateExecucao(osId)

  await mudarSituacao(osId, 'pronto')

  expect(await saldoDaPeca(peca.id)).toBe(8)
})

test('item de serviço não movimenta estoque', async () => {
  const { osId, servico, peca } = await cenarioOs()
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })
  await ateExecucao(osId)

  await mudarSituacao(osId, 'pronto')

  expect(await saldoDaPeca(peca.id)).toBe(0)
})

test('reabrir a OS estorna os movimentos dela', async () => {
  const { osId, peca } = await cenarioOs()
  await registrarMovimento({ pecaId: peca.id, tipo: 'entrada_compra', quantidade: 10 })
  await adicionarItem(osId, { tipo: 'peca', referenciaId: peca.id, quantidade: 3 })
  await ateExecucao(osId)
  await mudarSituacao(osId, 'pronto')

  await mudarSituacao(osId, 'em_execucao', { observacao: 'Voltou com defeito' })

  expect(await saldoDaPeca(peca.id)).toBe(10)
})

test('concluir de novo baixa a lista corrente, não a antiga', async () => {
  const { osId, peca } = await cenarioOs()
  await registrarMovimento({ pecaId: peca.id, tipo: 'entrada_compra', quantidade: 10 })
  await adicionarItem(osId, { tipo: 'peca', referenciaId: peca.id, quantidade: 3 })
  await ateExecucao(osId)
  await mudarSituacao(osId, 'pronto')
  await mudarSituacao(osId, 'em_execucao')

  // Troca a quantidade e conclui outra vez.
  const os = await obterOs(osId)
  await removerItem(os!.itens[0].id)
  await adicionarItem(osId, { tipo: 'peca', referenciaId: peca.id, quantidade: 1 })
  await mudarSituacao(osId, 'pronto')

  expect(await saldoDaPeca(peca.id)).toBe(9)
})

test('a baixa deixa o saldo negativo em vez de bloquear', async () => {
  const { osId, peca } = await cenarioOs()
  await adicionarItem(osId, { tipo: 'peca', referenciaId: peca.id, quantidade: 2 })
  await ateExecucao(osId)

  const r = await mudarSituacao(osId, 'pronto')

  expect(r.ok).toBe(true)
  expect(await saldoDaPeca(peca.id)).toBe(-2)
})
```

- [ ] **Step 3: Criar `testes/ajuda/os.ts`**

```ts
import { db } from '../../src/db'
import { clientes, equipamentos, pecas, servicos } from '../../src/db/schema'
import { criarOs } from '../../src/modulos/os/operacoes'

/** Cliente, equipamento, um serviço, uma peça e uma OS recém-recebida. */
export async function cenarioOs() {
  const [cliente] = await db.insert(clientes).values({ nome: 'Marcos Andrade' }).returning()
  const [equipamento] = await db
    .insert(equipamentos)
    .values({
      clienteId: cliente.id,
      tipoMotor: '2T',
      aplicacao: 'rocadeira',
      marca: 'Stihl',
      modelo: 'FS 220',
    })
    .returning()
  const [servico] = await db
    .insert(servicos)
    .values({ nome: 'Retífica de cilindro', precoPadraoCentavos: 21000 })
    .returning()
  const [peca] = await db
    .insert(pecas)
    .values({ nome: 'Kit cilindro 40mm', controlaSaldo: true, precoVendaCentavos: 3800 })
    .returning()

  const r = await criarOs({
    clienteId: cliente.id,
    equipamentoId: equipamento.id,
    problemaRelatado: 'Não pega a frio',
    acessoriosRecebidos: null,
    observacoes: null,
  })
  if (!r.ok) throw new Error('criação de OS falhou')

  return { cliente, equipamento, servico, peca, osId: r.dados.id, numero: r.dados.numero }
}
```

- [ ] **Step 4: Implementar `mudarSituacao`**

Estrutura obrigatória — tudo numa transação:

```ts
export async function mudarSituacao(
  osId: string,
  para: SituacaoOs,
  opcoes: { observacao?: string; motivo?: string; usuarioId?: string } = {},
): Promise<Resultado<null>> {
  return db.transaction(async (tx) => {
    const [os] = await tx.select().from(ordensServico).where(eq(ordensServico.id, osId)).limit(1)
    if (!os) return falha('Ordem de serviço não encontrada.')

    const de = os.situacao as SituacaoOs
    if (!transicaoPermitida(de, para)) {
      return falha(`Não é possível ir de ${SITUACOES[de]} para ${SITUACOES[para]}.`)
    }

    // 1. Estoque, quando a transição mexe nele
    if (para === 'pronto') await baixarEstoqueDaOs(tx, osId, opcoes.usuarioId)
    if (de === 'pronto' && para === 'em_execucao') {
      await estornarEstoqueDaOs(tx, osId, opcoes.usuarioId)
    }

    // 2. Versão de orçamento, quando o orçamento é enviado com itens diferentes
    const campos: Record<string, unknown> = { situacao: para, ...carimboDaEtapa(para, opcoes) }
    if (para === 'orcamento_enviado') {
      const versao = await gravarVersaoSeMudou(tx, os)
      if (versao !== null) campos.versaoOrcamento = versao
    }

    // 3. Situação e histórico
    await tx.update(ordensServico).set(campos).where(eq(ordensServico.id, osId))
    await tx.insert(osHistorico).values({
      osId,
      situacaoAnterior: de,
      situacaoNova: para,
      observacao: opcoes.observacao ?? opcoes.motivo ?? null,
      usuarioId: opcoes.usuarioId ?? null,
    })

    return sucesso(null)
  })
}
```

`baixarEstoqueDaOs` lê os itens de tipo `peca` e grava um movimento `saida_os` com quantidade negativa por item, `referenciaTipo: 'os'`, `referenciaId: osId`.

`estornarEstoqueDaOs` soma os movimentos `saida_os` daquela OS que ainda não foram estornados e grava movimentos `estorno_os` de sinal contrário. Não apaga nada — o razão é imutável.

`gravarVersaoSeMudou` compara os itens correntes com `itens` da última versão gravada; se forem iguais devolve `null` (reenvio sem alteração) e nada é criado.

- [ ] **Step 5: Rodar e commitar**

Run: `npx vitest run testes/integracao/os-transicoes.test.ts testes/integracao/os-estoque.test.ts`
Expected: PASS, 12 testes.

---

### Task 7: Compras

**Files:**
- Create: `src/modulos/compras/esquemas.ts`, `consultas.ts`, `operacoes.ts`
- Test: `testes/integracao/compras.test.ts`

**Interfaces:**
- Produces: `entradaCompra` (Zod), `registrarCompra(entrada): Promise<Resultado<{ id: string }>>`, `listarCompras(filtro)`, `obterCompra(id)`

Regras cobertas por teste: cada item da compra gera movimento `entrada_compra`; o último custo da peça é atualizado; compra sem item é recusada; compra vinculada a OS guarda o vínculo; o total da compra é a soma dos itens.

- [ ] **Step 1: Escrever `testes/integracao/compras.test.ts`**, cobrindo os cinco pontos acima
- [ ] **Step 2: Implementar** — tudo numa transação: `compras`, `compra_itens`, um `registrarMovimento` por item e `update pecas set ultimo_custo_centavos`
- [ ] **Step 3: Rodar e commitar** — Expected: PASS, 5 testes

---

### Task 8: Fotos da OS

**Files:**
- Create: `src/modulos/os/fotos.ts`, `src/app/api/fotos/[id]/route.ts`
- Test: `testes/integracao/os-fotos.test.ts`

**Interfaces:**
- Produces: `salvarFoto(osId, arquivo: File, momento): Promise<Resultado<{ id: string }>>`, `lerFoto(id): Promise<{ caminho: string } | null>`, `removerFoto(id)`

Decisões: arquivo em `uploads/os/<osId>/<uuid>.<ext>`, nome gerado (nunca o do usuário, que pode conter caminho); apenas `image/jpeg`, `image/png` e `image/webp`; limite de 8 MB; a rota `/api/fotos/[id]` exige sessão antes de devolver o arquivo, para que foto de cliente não seja acessível por URL adivinhada.

Regras cobertas por teste: tipo não permitido é recusado; arquivo acima do limite é recusado; o registro guarda tamanho e nome original; remover apaga registro e arquivo.

- [ ] **Step 1: Escrever o teste** — [ ] **Step 2: Implementar** — [ ] **Step 3: Rodar e commitar**

---

### Task 9: Telas de ordem de serviço

**Files:**
- Create: `src/modulos/os/acoes.ts`, `src/app/(app)/ordens-servico/page.tsx`, `filtros.tsx`, `nova/page.tsx`, `[id]/page.tsx` e os componentes das abas (`aba-diagnostico.tsx`, `aba-orcamento.tsx`, `aba-fotos.tsx`, `aba-historico.tsx`)
- Modify: `src/app/(app)/layout.tsx` (menu), `src/modulos/auth/acoes.ts` e `src/app/(auth)/entrar/page.tsx` (destino do login), specs e2e do Plano 1 que esperam `/clientes`
- Test: `testes/e2e/os-fluxo.spec.ts`

**A lista** (tela inicial) traz número, cliente, equipamento, situação, valor e cobrança, com busca e filtros de situação e período — o desenho escolhido no brainstorming.

**A ficha** tem cabeçalho fixo com número, situação, cliente, equipamento e total, o botão de próxima ação vindo de `proximaAcao()`, e cinco abas na ordem do fluxo: Diagnóstico · Orçamento · Fotos · Pagamentos · Histórico. A aba Pagamentos entra vazia aqui e é preenchida no Plano 3.

**Menu:** acrescentar Ordens de serviço (primeiro), Estoque e Compras. O destino do login muda de `/clientes` para `/ordens-servico`, e os testes e2e do Plano 1 acompanham.

**O e2e cobre o caminho completo:** cria cliente e equipamento, abre OS, lança diagnóstico, monta orçamento, aprova, conclui e entrega, conferindo que o estoque baixou e que o histórico tem as sete linhas.

- [ ] **Step 1: Escrever `testes/e2e/os-fluxo.spec.ts`** — [ ] **Step 2: Implementar ações e telas** — [ ] **Step 3: Ajustar menu, destino do login e specs afetados** — [ ] **Step 4: Rodar `npx playwright test` e commitar**

---

### Task 10: Telas de estoque e compras

**Files:**
- Create: `src/modulos/estoque/acoes.ts`, `src/modulos/compras/acoes.ts`, `src/app/(app)/estoque/page.tsx`, `ajuste-formulario.tsx`, `src/app/(app)/compras/page.tsx`, `nova/page.tsx`
- Test: `testes/e2e/estoque.spec.ts`

**Estoque:** lista de peças com saldo, destaque para saldo negativo e para quem está no mínimo, formulário de ajuste com motivo obrigatório, e o extrato de movimentos da peça.

**Compras:** lista e formulário com fornecedor, data, OS opcional e linhas de item com custo.

- [ ] **Step 1: Escrever o e2e** (ajuste move o saldo; ajuste sem motivo é recusado; compra entra no estoque) — [ ] **Step 2: Implementar** — [ ] **Step 3: Rodar e commitar**

---

## Verificação final do Plano 2

- [ ] `npm test` — toda a suíte de unidade e integração
- [ ] `npx playwright test` — todos os e2e, incluindo os do Plano 1
- [ ] `npm run build` — sem erro de tipo
- [ ] Conferência à mão: abrir uma OS, percorrer até a entrega, e verificar na tela de estoque que a peça baixou

## Fora deste plano

Pagamentos, contas a receber, despesas, resultado do mês, os três PDFs, mensagens de WhatsApp, painel, exportação CSV e implantação — tudo no Plano 3.
