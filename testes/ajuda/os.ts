import { db } from '../../src/db'
import { clientes, equipamentos, pecas, servicos } from '../../src/db/schema'
import { adicionarItem, criarOs, mudarSituacao } from '../../src/modulos/os/operacoes'
import type { SituacaoOs } from '../../src/modulos/os/situacoes'

/** Cliente, equipamento, um serviço, uma peça e uma OS recém-recebida. */
export async function cenarioOs() {
  const [cliente] = await db.insert(clientes).values({ nome: 'Marcos Andrade' }).returning()
  const [equipamento] = await db
    .insert(equipamentos)
    .values({
      clienteId: cliente.id,
      tipoMotor: '2T',
      aplicacao: 'rocadeira',
      marca: 'Stihl',
      modelo: 'FS 220',
    })
    .returning()
  const [servico] = await db
    .insert(servicos)
    .values({ nome: 'Retífica de cilindro', precoPadraoCentavos: 21000 })
    .returning()
  // Peça não tem preço de tabela: quem lança na OS informa o valor.
  const [peca] = await db
    .insert(pecas)
    .values({ nome: 'Kit cilindro 40mm', controlaSaldo: true })
    .returning()

  const r = await criarOs({
    clienteId: cliente.id,
    equipamentoId: equipamento.id,
    problemaRelatado: 'Não pega a frio',
    acessoriosRecebidos: null,
    observacoes: null,
  })
  if (!r.ok) throw new Error('criação de OS falhou')

  return { cliente, equipamento, servico, peca, osId: r.dados.id, numero: r.dados.numero }
}

/** O mesmo cenário, com um serviço de R$ 210,00 já lançado na OS. */
export async function osComValor() {
  const cenario = await cenarioOs()
  await adicionarItem(cenario.osId, {
    tipo: 'servico',
    referenciaId: cenario.servico.id,
    quantidade: 1,
  })
  return cenario
}

const ATE_APROVADO: SituacaoOs[] = ['em_diagnostico', 'orcamento_enviado', 'aprovado']
const ATE_PRONTO: SituacaoOs[] = [...ATE_APROVADO, 'em_execucao', 'pronto']

const CAMINHO: Partial<Record<SituacaoOs, SituacaoOs[]>> = {
  em_diagnostico: ['em_diagnostico'],
  orcamento_enviado: ['em_diagnostico', 'orcamento_enviado'],
  aprovado: ATE_APROVADO,
  aguardando_peca: [...ATE_APROVADO, 'aguardando_peca'],
  em_execucao: [...ATE_APROVADO, 'em_execucao'],
  pronto: ATE_PRONTO,
  entregue: [...ATE_PRONTO, 'entregue'],
  recusado: ['em_diagnostico', 'orcamento_enviado', 'recusado'],
  devolvido: ['em_diagnostico', 'orcamento_enviado', 'recusado', 'devolvido'],
  cancelado: ['cancelado'],
}

/**
 * Leva a OS até a situação pedida percorrendo o fluxo passo a passo — saltar
 * etapa é recusado pela transição, e os carimbos de data nascem no caminho.
 */
export async function levarAte(osId: string, alvo: SituacaoOs): Promise<void> {
  for (const passo of CAMINHO[alvo] ?? []) {
    const r = await mudarSituacao(osId, passo)
    if (!r.ok) throw new Error(`não deu para levar a OS até ${passo}: ${r.erro}`)
  }
}
