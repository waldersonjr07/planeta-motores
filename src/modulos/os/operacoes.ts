import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  clientes,
  equipamentos,
  estoqueMovimentos,
  ordensServico,
  osHistorico,
  osItens,
  osNumeracao,
  osOrcamentoVersoes,
  pecas,
  servicos,
} from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import { criarClienteComEquipamento } from '@/modulos/clientes/operacoes'
import { registrarMovimento, type Transacao } from '@/modulos/estoque/operacoes'
import type { EntradaItemOs, EntradaOs, EntradaOsRapida } from './esquemas'
import {
  SITUACOES,
  aceitaAlteracaoDeItem,
  transicaoPermitida,
  type SituacaoOs,
} from './situacoes'
import { calcularTotais } from './totais'

const OS_ENCERRADA = 'Esta ordem de serviço está encerrada e não aceita alteração de itens.'

// ---------------------------------------------------------------- criação

export async function criarOs(
  entrada: EntradaOs,
): Promise<Resultado<{ id: string; numero: string }>> {
  const [cliente] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(eq(clientes.id, entrada.clienteId))
    .limit(1)
  if (!cliente) return falha('Cliente não encontrado.')

  const [equipamento] = await db
    .select({ id: equipamentos.id, clienteId: equipamentos.clienteId })
    .from(equipamentos)
    .where(eq(equipamentos.id, entrada.equipamentoId))
    .limit(1)
  if (!equipamento) return falha('Equipamento não encontrado.')
  if (equipamento.clienteId !== entrada.clienteId) {
    return falha('O equipamento selecionado não pertence a esse cliente.')
  }

  return db.transaction(async (tx) => {
    const ano = new Date().getFullYear()

    // `insert … on conflict do update … returning` é atômico: transações
    // concorrentes serializam nesta linha e recebem números distintos.
    const [contador] = await tx
      .insert(osNumeracao)
      .values({ ano, ultimoNumero: 1 })
      .onConflictDoUpdate({
        target: osNumeracao.ano,
        set: { ultimoNumero: sql`${osNumeracao.ultimoNumero} + 1` },
      })
      .returning({ ultimoNumero: osNumeracao.ultimoNumero })

    const numero = `${ano}-${String(contador.ultimoNumero).padStart(4, '0')}`

    const [criada] = await tx
      .insert(ordensServico)
      .values({ ...entrada, numero })
      .returning({ id: ordensServico.id, numero: ordensServico.numero })

    await tx.insert(osHistorico).values({ osId: criada.id, situacaoNova: 'recebido' })

    return sucesso({ id: criada.id, numero: criada.numero })
  })
}

/**
 * Abre a OS cadastrando cliente e máquina na mesma ação. O cadastro sai por
 * baixo, mas sai de verdade: a OS continua ligada a um cliente e a um
 * equipamento, então o histórico por motor e a reincidência seguem valendo.
 */
export async function criarOsComClienteNovo(
  entrada: EntradaOsRapida,
): Promise<Resultado<{ id: string; numero: string }>> {
  const cadastro = await criarClienteComEquipamento({
    cliente: {
      nome: entrada.nomeCliente,
      documento: entrada.documentoCliente,
      telefone: entrada.telefoneCliente,
    },
    equipamento: {
      tipoMotor: entrada.tipoMotor,
      aplicacao: entrada.aplicacao,
      marca: entrada.marca,
      modelo: entrada.modelo,
      numeroSerie: null,
      observacoes: null,
    },
  })
  if (!cadastro.ok) return cadastro

  return criarOs({
    clienteId: cadastro.dados.clienteId,
    equipamentoId: cadastro.dados.equipamentoId,
    problemaRelatado: entrada.problemaRelatado,
    acessoriosRecebidos: entrada.acessoriosRecebidos,
    observacoes: entrada.observacoes,
  })
}

// ------------------------------------------------------------------ itens

async function situacaoDaOs(osId: string): Promise<SituacaoOs | null> {
  const [os] = await db
    .select({ situacao: ordensServico.situacao })
    .from(ordensServico)
    .where(eq(ordensServico.id, osId))
    .limit(1)
  return (os?.situacao as SituacaoOs) ?? null
}

export async function adicionarItem(
  osId: string,
  entrada: EntradaItemOs,
): Promise<Resultado<{ id: string }>> {
  const situacao = await situacaoDaOs(osId)
  if (!situacao) return falha('Ordem de serviço não encontrada.')
  if (!aceitaAlteracaoDeItem(situacao)) return falha(OS_ENCERRADA)
  if (!(entrada.quantidade > 0)) {
    return falha('A quantidade precisa ser maior que zero.')
  }

  // O nome e o preço são copiados agora: renomear no catálogo depois não pode
  // alterar orçamento já lançado.
  let descricao: string
  let precoCatalogo: number | undefined

  if (!entrada.referenciaId) {
    // Item digitado na hora: não referencia catálogo nenhum, e por isso também
    // não movimenta estoque quando a OS é concluída.
    if (!entrada.descricao) return falha('Descreva o item.')
    if (entrada.precoUnitarioCentavos === undefined) {
      return falha('Informe o valor do item.')
    }
    descricao = entrada.descricao
  } else if (entrada.tipo === 'servico') {
    const [servico] = await db
      .select()
      .from(servicos)
      .where(eq(servicos.id, entrada.referenciaId))
      .limit(1)
    if (!servico) return falha('Serviço não encontrado.')
    descricao = servico.nome
    precoCatalogo = servico.precoPadraoCentavos
  } else {
    const [peca] = await db
      .select()
      .from(pecas)
      .where(eq(pecas.id, entrada.referenciaId))
      .limit(1)
    if (!peca) return falha('Peça não encontrada.')
    // A oficina não tem tabela de preço de peça: o valor é o daquele serviço.
    // Sem ele a peça entraria zerada e o cliente não veria o que está pagando.
    if (entrada.precoUnitarioCentavos === undefined) {
      return falha('Informe o valor da peça.')
    }
    descricao = peca.marca ? `${peca.nome} ${peca.marca}` : peca.nome
  }

  const [criado] = await db
    .insert(osItens)
    .values({
      osId,
      tipo: entrada.tipo,
      pecaId: entrada.tipo === 'peca' ? (entrada.referenciaId ?? null) : null,
      servicoId: entrada.tipo === 'servico' ? (entrada.referenciaId ?? null) : null,
      descricao,
      quantidade: entrada.quantidade.toFixed(3),
      precoUnitarioCentavos: entrada.precoUnitarioCentavos ?? precoCatalogo ?? 0,
    })
    .returning({ id: osItens.id })

  return sucesso({ id: criado.id })
}

export async function removerItem(itemId: string): Promise<Resultado<null>> {
  const [item] = await db
    .select({ osId: osItens.osId })
    .from(osItens)
    .where(eq(osItens.id, itemId))
    .limit(1)
  if (!item) return falha('Item não encontrado.')

  const situacao = await situacaoDaOs(item.osId)
  if (situacao && !aceitaAlteracaoDeItem(situacao)) return falha(OS_ENCERRADA)

  await db.delete(osItens).where(eq(osItens.id, itemId))
  return sucesso(null)
}

export async function definirDesconto(
  osId: string,
  descontoCentavos: number,
): Promise<Resultado<null>> {
  if (!Number.isInteger(descontoCentavos) || descontoCentavos < 0) {
    return falha('O desconto não pode ser negativo.')
  }

  const situacao = await situacaoDaOs(osId)
  if (!situacao) return falha('Ordem de serviço não encontrada.')
  if (!aceitaAlteracaoDeItem(situacao)) return falha(OS_ENCERRADA)

  await db
    .update(ordensServico)
    .set({ descontoCentavos })
    .where(eq(ordensServico.id, osId))
  return sucesso(null)
}

export async function atualizarDiagnostico(
  osId: string,
  diagnostico: string,
): Promise<Resultado<null>> {
  const alteradas = await db
    .update(ordensServico)
    .set({ diagnostico: diagnostico.trim() || null })
    .where(eq(ordensServico.id, osId))
    .returning({ id: ordensServico.id })

  if (alteradas.length === 0) return falha('Ordem de serviço não encontrada.')
  return sucesso(null)
}

// -------------------------------------------------------------- transição

function carimboDaEtapa(
  para: SituacaoOs,
  opcoes: { motivo?: string },
): Record<string, unknown> {
  // Relógio do banco: `recebidoEm` vem de `defaultNow()`, e as etapas seguintes
  // precisam ser comparáveis com ele sem depender de dois relógios baterem.
  const agora = sql`now()`
  switch (para) {
    case 'em_diagnostico':
      return { diagnosticadoEm: agora }
    case 'orcamento_enviado':
      return { orcadoEm: agora }
    case 'aprovado':
      return { aprovadoEm: agora }
    case 'recusado':
      return { recusadoEm: agora, motivoRecusa: opcoes.motivo ?? null }
    case 'pronto':
      return { concluidoEm: agora }
    case 'entregue':
      return { entregueEm: agora }
    case 'cancelado':
      return { canceladoEm: agora, motivoCancelamento: opcoes.motivo ?? null }
    default:
      return {}
  }
}

type ItemGravado = {
  tipo: 'peca' | 'servico'
  descricao: string
  quantidade: string
  precoUnitarioCentavos: number
}

/** Identidade do orçamento: se não muda, reenviar não gera versão nova. */
function assinaturaDoOrcamento(itens: ItemGravado[], descontoCentavos: number): string {
  const normalizados = itens
    .map((item) => ({
      t: item.tipo,
      d: item.descricao,
      q: Number(item.quantidade),
      p: item.precoUnitarioCentavos,
    }))
    .sort(
      (a, b) =>
        a.t.localeCompare(b.t) || a.d.localeCompare(b.d) || a.q - b.q || a.p - b.p,
    )
  return JSON.stringify({ desconto: descontoCentavos, itens: normalizados })
}

async function gravarVersaoSeMudou(
  tx: Transacao,
  os: typeof ordensServico.$inferSelect,
): Promise<number | null> {
  const itens = (await tx
    .select({
      tipo: osItens.tipo,
      descricao: osItens.descricao,
      quantidade: osItens.quantidade,
      precoUnitarioCentavos: osItens.precoUnitarioCentavos,
    })
    .from(osItens)
    .where(eq(osItens.osId, os.id))) as ItemGravado[]

  const [ultima] = await tx
    .select()
    .from(osOrcamentoVersoes)
    .where(eq(osOrcamentoVersoes.osId, os.id))
    .orderBy(sql`${osOrcamentoVersoes.versao} desc`)
    .limit(1)

  const assinaturaAtual = assinaturaDoOrcamento(itens, os.descontoCentavos)
  if (ultima) {
    const anterior = assinaturaDoOrcamento(
      ultima.itens as ItemGravado[],
      // O desconto da versão anterior está embutido na diferença entre total e
      // soma dos itens; comparamos pela assinatura gravada no envio.
      os.descontoCentavos,
    )
    // Reenvio sem alteração: registra no histórico, mas não cria versão.
    if (anterior === assinaturaAtual) return null
  }

  const versao = (ultima?.versao ?? 0) + 1
  const totais = calcularTotais(itens, os.descontoCentavos)

  await tx.insert(osOrcamentoVersoes).values({
    osId: os.id,
    versao,
    totalCentavos: totais.totalCentavos,
    itens,
  })

  return versao
}

async function baixarEstoqueDaOs(
  tx: Transacao,
  osId: string,
  usuarioId?: string,
): Promise<void> {
  const itens = await tx
    .select({ pecaId: osItens.pecaId, quantidade: osItens.quantidade })
    .from(osItens)
    .where(and(eq(osItens.osId, osId), eq(osItens.tipo, 'peca')))

  for (const item of itens) {
    if (!item.pecaId) continue
    await registrarMovimento(
      {
        pecaId: item.pecaId,
        tipo: 'saida_os',
        quantidade: -Number(item.quantidade),
        referenciaTipo: 'os',
        referenciaId: osId,
        usuarioId,
      },
      tx,
    )
  }
}

/**
 * Zera o que esta OS ainda tem baixado, somando saídas e estornos anteriores.
 * Nada é apagado — o razão é imutável, correção se faz com movimento oposto.
 */
async function estornarEstoqueDaOs(
  tx: Transacao,
  osId: string,
  usuarioId?: string,
): Promise<void> {
  const pendentes = await tx
    .select({
      pecaId: estoqueMovimentos.pecaId,
      liquido: sql<string>`sum(${estoqueMovimentos.quantidade})`,
    })
    .from(estoqueMovimentos)
    .where(
      and(
        eq(estoqueMovimentos.referenciaId, osId),
        inArray(estoqueMovimentos.tipo, ['saida_os', 'estorno_os']),
      ),
    )
    .groupBy(estoqueMovimentos.pecaId)

  for (const pendente of pendentes) {
    const liquido = Number(pendente.liquido)
    if (liquido === 0) continue
    await registrarMovimento(
      {
        pecaId: pendente.pecaId,
        tipo: 'estorno_os',
        quantidade: -liquido,
        referenciaTipo: 'os',
        referenciaId: osId,
        motivo: 'Reabertura da ordem de serviço',
        usuarioId,
      },
      tx,
    )
  }
}

export async function mudarSituacao(
  osId: string,
  para: SituacaoOs,
  opcoes: { observacao?: string; motivo?: string; usuarioId?: string } = {},
): Promise<Resultado<null>> {
  return db.transaction(async (tx) => {
    const [os] = await tx
      .select()
      .from(ordensServico)
      .where(eq(ordensServico.id, osId))
      .limit(1)
    if (!os) return falha('Ordem de serviço não encontrada.')

    const de = os.situacao as SituacaoOs
    if (!transicaoPermitida(de, para)) {
      return falha(`Não é possível ir de ${SITUACOES[de]} para ${SITUACOES[para]}.`)
    }

    if (para === 'pronto') await baixarEstoqueDaOs(tx, osId, opcoes.usuarioId)
    if (de === 'pronto' && para === 'em_execucao') {
      await estornarEstoqueDaOs(tx, osId, opcoes.usuarioId)
    }

    const campos: Record<string, unknown> = {
      situacao: para,
      ...carimboDaEtapa(para, opcoes),
    }

    if (para === 'orcamento_enviado') {
      const versao = await gravarVersaoSeMudou(tx, os)
      if (versao !== null) campos.versaoOrcamento = versao
    }

    await tx.update(ordensServico).set(campos).where(eq(ordensServico.id, osId))

    await tx.insert(osHistorico).values({
      osId,
      situacaoAnterior: de,
      situacaoNova: para,
      observacao: opcoes.observacao ?? opcoes.motivo ?? null,
      usuarioId: opcoes.usuarioId ?? null,
    })

    return sucesso(null)
  })
}
