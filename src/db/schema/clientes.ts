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
  /** O que é a máquina quando `aplicacao` é 'outro'. Nula nas demais. */
  aplicacaoOutra: text('aplicacao_outra'),
  marca: text('marca'),
  modelo: text('modelo'),
  numeroSerie: text('numero_serie'),
  observacoes: text('observacoes'),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})
