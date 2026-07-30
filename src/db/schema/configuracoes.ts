import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Tabela de linha única: `id` é sempre 1. O módulo de configurações é o único
 * a escrever aqui e garante essa invariante.
 */
export const configuracoes = pgTable('configuracoes', {
  id: integer('id').primaryKey(),
  empresaNome: text('empresa_nome').notNull().default('Planeta Motores'),
  empresaCnpj: text('empresa_cnpj'),
  empresaTelefone: text('empresa_telefone'),
  empresaEndereco: text('empresa_endereco'),
  logoCaminho: text('logo_caminho'),
  orcamentoValidadeDias: integer('orcamento_validade_dias').notNull().default(15),
  modeloMsgOrcamento: text('modelo_msg_orcamento')
    .notNull()
    .default(
      'Olá {{cliente}}, o orçamento da OS {{numero}} ({{equipamento}}) ficou em {{total}}. Posso seguir com o serviço?',
    ),
  modeloMsgPronto: text('modelo_msg_pronto')
    .notNull()
    .default(
      'Olá {{cliente}}, o serviço da OS {{numero}} ({{equipamento}}) está pronto para retirada. Valor: {{total}}.',
    ),
  modeloMsgCobranca: text('modelo_msg_cobranca')
    .notNull()
    .default(
      'Olá {{cliente}}, consta em aberto o valor de {{saldo}} referente à OS {{numero}}. Podemos combinar o pagamento?',
    ),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
})
