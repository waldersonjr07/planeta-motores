import { randomUUID } from 'node:crypto'
import {
  integer,
  numeric,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core'

export const unidadePecaValores = ['un', 'L', 'mL'] as const
/** A oficina compra peça por unidade e fluido por volume. Nada é vendido a peso. */
export const unidadePeca = (col = 'unidade') => text(col, { enum: unidadePecaValores })

export const servicos = sqliteTable('servicos', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  precoPadraoCentavos: integer('preco_padrao_centavos').notNull().default(0),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp_ms' }).notNull().defaultNow(),
})

export const pecas = sqliteTable('pecas', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  nome: text('nome').notNull(),
  marca: text('marca'),
  unidade: unidadePeca('unidade').notNull().default('un'),
  /** Liga o acompanhamento de saldo e a presença na tela de reposição. */
  controlaSaldo: integer('controla_saldo', { mode: 'boolean' }).notNull().default(false),
  quantidadeMinima: numeric('quantidade_minima')
    .notNull()
    .default('0'),
  ultimoCustoCentavos: integer('ultimo_custo_centavos'),
  precoVendaCentavos: integer('preco_venda_centavos').notNull().default(0),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp_ms' }).notNull().defaultNow(),
})

export const fornecedores = sqliteTable('fornecedores', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  nome: text('nome').notNull(),
  telefone: text('telefone'),
  email: text('email'),
  observacoes: text('observacoes'),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp_ms' }).notNull().defaultNow(),
})
