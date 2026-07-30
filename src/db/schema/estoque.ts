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
  /** Com sinal: entrada positiva, saída negativa. O saldo é a soma. */
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
