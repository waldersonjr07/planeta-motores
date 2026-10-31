import { randomUUID } from 'node:crypto'
import {
  integer,
  numeric,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core'
import { fornecedores, pecas } from './catalogo'
import { ordensServico } from './os'
import { usuarios } from './usuarios'

export const tipoMovimentoValores = [
  'entrada_compra',
  'saida_os',
  'estorno_os',
  'ajuste',
] as const
export const tipoMovimento = (col = 'tipo') => text(col, { enum: tipoMovimentoValores })

export const estoqueMovimentos = sqliteTable('estoque_movimentos', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  pecaId: text('peca_id')
    .notNull()
    .references(() => pecas.id, { onDelete: 'restrict' }),
  tipo: tipoMovimento('tipo').notNull(),
  /** Com sinal: entrada positiva, saída negativa. O saldo é a soma. */
  quantidade: numeric('quantidade').notNull(),
  referenciaTipo: text('referencia_tipo'),
  referenciaId: text('referencia_id'),
  motivo: text('motivo'),
  usuarioId: text('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
  criadoEm: integer('criado_em', { mode: 'timestamp_ms' }).notNull().defaultNow(),
})

export const compras = sqliteTable('compras', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  fornecedorId: text('fornecedor_id').references(() => fornecedores.id, {
    onDelete: 'restrict',
  }),
  /** A OS que motivou a compra, quando a peça foi comprada sob demanda. */
  osId: text('os_id').references(() => ordensServico.id, { onDelete: 'set null' }),
  data: text('data').notNull(),
  numeroDocumento: text('numero_documento'),
  observacoes: text('observacoes'),
  criadoEm: integer('criado_em', { mode: 'timestamp_ms' }).notNull().defaultNow(),
})

export const compraItens = sqliteTable('compra_itens', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  compraId: text('compra_id')
    .notNull()
    .references(() => compras.id, { onDelete: 'cascade' }),
  pecaId: text('peca_id')
    .notNull()
    .references(() => pecas.id, { onDelete: 'restrict' }),
  quantidade: numeric('quantidade').notNull(),
  custoUnitarioCentavos: integer('custo_unitario_centavos').notNull(),
})
