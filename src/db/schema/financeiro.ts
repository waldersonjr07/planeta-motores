import { randomUUID } from 'node:crypto'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { fornecedores } from './catalogo'
import { ordensServico } from './os'

export const formaPagamentoValores = [
  'dinheiro',
  'pix',
  'cartao_debito',
  'cartao_credito',
  'transferencia',
] as const
export const formaPagamento = (col = 'forma') => text(col, { enum: formaPagamentoValores })

export const categoriaDespesaValores = [
  'ferramenta',
  'aluguel',
  'energia',
  'combustivel',
  'outros',
] as const
export const categoriaDespesa = (col = 'categoria') =>
  text(col, { enum: categoriaDespesaValores })

/** Uma OS pode ter vários: sinal para comprar peça e saldo na entrega. */
export const pagamentos = sqliteTable('pagamentos', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  osId: text('os_id')
    .notNull()
    .references(() => ordensServico.id, { onDelete: 'cascade' }),
  valorCentavos: integer('valor_centavos').notNull(),
  forma: formaPagamento('forma').notNull(),
  data: text('data').notNull(),
  observacao: text('observacao'),
  criadoEm: integer('criado_em', { mode: 'timestamp_ms' }).notNull().defaultNow(),
})

/** Saídas que não são compra de peça — compra já é a despesa de peça. */
export const despesas = sqliteTable('despesas', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  data: text('data').notNull(),
  categoria: categoriaDespesa('categoria').notNull().default('outros'),
  /** Só faz sentido em "outros"; nas demais a categoria já descreve. */
  descricao: text('descricao'),
  valorCentavos: integer('valor_centavos').notNull(),
  fornecedorId: text('fornecedor_id').references(() => fornecedores.id, {
    onDelete: 'set null',
  }),
  criadoEm: integer('criado_em', { mode: 'timestamp_ms' }).notNull().defaultNow(),
})
