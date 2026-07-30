import { date, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { fornecedores } from './catalogo'
import { ordensServico } from './os'

export const formaPagamento = pgEnum('forma_pagamento', [
  'dinheiro',
  'pix',
  'cartao_debito',
  'cartao_credito',
  'transferencia',
])

export const categoriaDespesa = pgEnum('categoria_despesa', [
  'ferramenta',
  'aluguel',
  'energia',
  'combustivel',
  'outros',
])

/** Uma OS pode ter vários: sinal para comprar peça e saldo na entrega. */
export const pagamentos = pgTable('pagamentos', {
  id: uuid('id').primaryKey().defaultRandom(),
  osId: uuid('os_id')
    .notNull()
    .references(() => ordensServico.id, { onDelete: 'cascade' }),
  valorCentavos: integer('valor_centavos').notNull(),
  forma: formaPagamento('forma').notNull(),
  data: date('data').notNull(),
  observacao: text('observacao'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

/** Saídas que não são compra de peça — compra já é a despesa de peça. */
export const despesas = pgTable('despesas', {
  id: uuid('id').primaryKey().defaultRandom(),
  data: date('data').notNull(),
  categoria: categoriaDespesa('categoria').notNull().default('outros'),
  descricao: text('descricao').notNull(),
  valorCentavos: integer('valor_centavos').notNull(),
  fornecedorId: uuid('fornecedor_id').references(() => fornecedores.id, {
    onDelete: 'set null',
  }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})
