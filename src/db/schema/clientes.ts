import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

export const tipoPessoaValores = ['fisica', 'juridica'] as const
export const tipoPessoa = (col = 'tipo_pessoa') => text(col, { enum: tipoPessoaValores })

export const tipoMotorValores = ['2T', '4T'] as const
export const tipoMotor = (col = 'tipo_motor') => text(col, { enum: tipoMotorValores })

export const aplicacaoEquipamentoValores = [
  'rocadeira',
  'motosserra',
  'motobomba',
  'gerador',
  'soprador',
  'outro',
] as const
export const aplicacaoEquipamento = (col = 'aplicacao') =>
  text(col, { enum: aplicacaoEquipamentoValores })

export const clientes = sqliteTable(
  'clientes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
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
    ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
    criadoEm: integer('criado_em', { mode: 'timestamp_ms' }).notNull().defaultNow(),
    atualizadoEm: integer('atualizado_em', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  },
  (tabela) => [
    // Parcial: documento nulo não colide com documento nulo.
    uniqueIndex('clientes_documento_unico')
      .on(tabela.documento)
      .where(sql`${tabela.documento} is not null`),
  ],
)

export const equipamentos = sqliteTable('equipamentos', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  clienteId: text('cliente_id')
    .notNull()
    .references(() => clientes.id, { onDelete: 'cascade' }),
  tipoMotor: tipoMotor('tipo_motor').notNull(),
  aplicacao: aplicacaoEquipamento('aplicacao').notNull(),
  /** O que é a máquina quando `aplicacao` é 'outro'. Nula nas demais. */
  aplicacaoOutra: text('aplicacao_outra'),
  marca: text('marca'),
  modelo: text('modelo'),
  numeroSerie: text('numero_serie'),
  observacoes: text('observacoes'),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp_ms' }).notNull().defaultNow(),
})
