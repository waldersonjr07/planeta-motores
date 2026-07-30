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
