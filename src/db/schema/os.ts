import { randomUUID } from 'node:crypto'
import {
  integer,
  numeric,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { pecas, servicos } from './catalogo'
import { clientes, equipamentos } from './clientes'
import { usuarios } from './usuarios'

export const situacaoOsValores = [
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
] as const
export const situacaoOs = (col = 'situacao') => text(col, { enum: situacaoOsValores })

export const tipoItemOsValores = ['peca', 'servico'] as const
export const tipoItemOs = (col = 'tipo') => text(col, { enum: tipoItemOsValores })

export const momentoFotoValores = ['chegada', 'dano', 'conclusao'] as const
export const momentoFoto = (col = 'momento') => text(col, { enum: momentoFotoValores })

export const ordensServico = sqliteTable('ordens_servico', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  numero: text('numero').notNull().unique(),
  clienteId: text('cliente_id')
    .notNull()
    .references(() => clientes.id, { onDelete: 'restrict' }),
  equipamentoId: text('equipamento_id')
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
  recebidoEm: integer('recebido_em', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  diagnosticadoEm: integer('diagnosticado_em', { mode: 'timestamp_ms' }),
  orcadoEm: integer('orcado_em', { mode: 'timestamp_ms' }),
  aprovadoEm: integer('aprovado_em', { mode: 'timestamp_ms' }),
  recusadoEm: integer('recusado_em', { mode: 'timestamp_ms' }),
  motivoRecusa: text('motivo_recusa'),
  concluidoEm: integer('concluido_em', { mode: 'timestamp_ms' }),
  entregueEm: integer('entregue_em', { mode: 'timestamp_ms' }),
  canceladoEm: integer('cancelado_em', { mode: 'timestamp_ms' }),
  motivoCancelamento: text('motivo_cancelamento'),
  criadoEm: integer('criado_em', { mode: 'timestamp_ms' }).notNull().defaultNow(),
})

export const osItens = sqliteTable('os_itens', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  osId: text('os_id')
    .notNull()
    .references(() => ordensServico.id, { onDelete: 'cascade' }),
  tipo: tipoItemOs('tipo').notNull(),
  pecaId: text('peca_id').references(() => pecas.id, { onDelete: 'restrict' }),
  servicoId: text('servico_id').references(() => servicos.id, { onDelete: 'restrict' }),
  /** Nome copiado no lançamento: renomear no catálogo não altera orçamento antigo. */
  descricao: text('descricao').notNull(),
  quantidade: numeric('quantidade').notNull(),
  precoUnitarioCentavos: integer('preco_unitario_centavos').notNull(),
  criadoEm: integer('criado_em', { mode: 'timestamp_ms' }).notNull().defaultNow(),
})

export const osFotos = sqliteTable('os_fotos', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  osId: text('os_id')
    .notNull()
    .references(() => ordensServico.id, { onDelete: 'cascade' }),
  momento: momentoFoto('momento').notNull().default('chegada'),
  caminhoArquivo: text('caminho_arquivo').notNull(),
  nomeOriginal: text('nome_original'),
  tamanhoBytes: integer('tamanho_bytes'),
  legenda: text('legenda'),
  criadoEm: integer('criado_em', { mode: 'timestamp_ms' }).notNull().defaultNow(),
})

export const osHistorico = sqliteTable('os_historico', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  osId: text('os_id')
    .notNull()
    .references(() => ordensServico.id, { onDelete: 'cascade' }),
  situacaoAnterior: situacaoOs('situacao_anterior'),
  situacaoNova: situacaoOs('situacao_nova').notNull(),
  observacao: text('observacao'),
  usuarioId: text('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
  criadoEm: integer('criado_em', { mode: 'timestamp_ms' }).notNull().defaultNow(),
})

export const osOrcamentoVersoes = sqliteTable(
  'os_orcamento_versoes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    osId: text('os_id')
      .notNull()
      .references(() => ordensServico.id, { onDelete: 'cascade' }),
    versao: integer('versao').notNull(),
    totalCentavos: integer('total_centavos').notNull(),
    /** Cópia dos itens no momento do envio, para reproduzir o que o cliente viu. */
    itens: text('itens', { mode: 'json' }).notNull(),
    enviadoEm: integer('enviado_em', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  },
  (tabela) => [uniqueIndex('os_orcamento_versao_unica').on(tabela.osId, tabela.versao)],
)

/** Contador por ano, incrementado atomicamente na transação que cria a OS. */
export const osNumeracao = sqliteTable('os_numeracao', {
  ano: integer('ano').primaryKey(),
  ultimoNumero: integer('ultimo_numero').notNull().default(0),
})
