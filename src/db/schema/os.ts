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
import { pecas, servicos } from './catalogo'
import { clientes, equipamentos } from './clientes'
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

/** Contador por ano, incrementado atomicamente na transação que cria a OS. */
export const osNumeracao = pgTable('os_numeracao', {
  ano: integer('ano').primaryKey(),
  ultimoNumero: integer('ultimo_numero').notNull().default(0),
})
