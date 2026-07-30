import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  clientes,
  equipamentos,
  ordensServico,
  osFotos,
  osHistorico,
  osItens,
  osOrcamentoVersoes,
} from '@/db/schema'
import { descreverEquipamento } from '@/modulos/clientes/equipamentos-descricao'
import type { SituacaoOs } from './situacoes'
import { calcularTotais, type TotaisOs } from './totais'

/**
 * Nota de fronteira: a regra do projeto é que módulo não escreve tabela de
 * outro. Para *leitura de listagem* o módulo `os` junta `clientes` e
 * `equipamentos` — buscar nome de cliente linha a linha por função exportada
 * seria uma consulta por OS sem ganho nenhum. Escrita continua exclusiva do
 * módulo dono.
 */

export type OsResumo = {
  id: string
  numero: string
  situacao: SituacaoOs
  clienteNome: string
  equipamentoDescricao: string
  totalCentavos: number
  recebidoEm: Date
  entregueEm: Date | null
}

export type OsCompleta = typeof ordensServico.$inferSelect & {
  cliente: { id: string; nome: string; telefone: string | null }
  equipamento: { id: string; descricao: string; numeroSerie: string | null }
  itens: (typeof osItens.$inferSelect)[]
  totais: TotaisOs
  historico: (typeof osHistorico.$inferSelect)[]
  fotos: (typeof osFotos.$inferSelect)[]
  versoesOrcamento: (typeof osOrcamentoVersoes.$inferSelect)[]
}

export async function listarOs(
  filtro: {
    busca?: string
    situacoes?: SituacaoOs[]
    de?: string
    ate?: string
  } = {},
): Promise<OsResumo[]> {
  const condicoes = []

  if (filtro.situacoes?.length) {
    condicoes.push(inArray(ordensServico.situacao, filtro.situacoes))
  }
  if (filtro.de) condicoes.push(gte(ordensServico.recebidoEm, new Date(filtro.de)))
  if (filtro.ate) {
    const fim = new Date(filtro.ate)
    fim.setHours(23, 59, 59, 999)
    condicoes.push(lte(ordensServico.recebidoEm, fim))
  }

  const busca = filtro.busca?.trim()
  if (busca) {
    const alvo = `%${busca}%`
    condicoes.push(
      or(
        ilike(ordensServico.numero, alvo),
        ilike(clientes.nome, alvo),
        ilike(equipamentos.marca, alvo),
        ilike(equipamentos.modelo, alvo),
      )!,
    )
  }

  const linhas = await db
    .select({
      id: ordensServico.id,
      numero: ordensServico.numero,
      situacao: ordensServico.situacao,
      descontoCentavos: ordensServico.descontoCentavos,
      recebidoEm: ordensServico.recebidoEm,
      entregueEm: ordensServico.entregueEm,
      clienteNome: clientes.nome,
      tipoMotor: equipamentos.tipoMotor,
      aplicacao: equipamentos.aplicacao,
      marca: equipamentos.marca,
      modelo: equipamentos.modelo,
      // Total já somado no banco. Identificadores à mão, com apelido na tabela
      // interna: o Drizzle renderiza `${tabela.coluna}` sem qualificação dentro
      // de um template `sql`, e num subselect correlacionado o `"id"` passaria a
      // resolver para a tabela de dentro — a soma voltaria zerada em silêncio.
      somaItens: sql<string>`coalesce((
        select sum(i.quantidade * i.preco_unitario_centavos)
        from os_itens i
        where i.os_id = ordens_servico.id
      ), 0)`,
    })
    .from(ordensServico)
    .innerJoin(clientes, eq(clientes.id, ordensServico.clienteId))
    .innerJoin(equipamentos, eq(equipamentos.id, ordensServico.equipamentoId))
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(desc(ordensServico.recebidoEm))

  return linhas.map((linha) => ({
    id: linha.id,
    numero: linha.numero,
    situacao: linha.situacao as SituacaoOs,
    clienteNome: linha.clienteNome,
    equipamentoDescricao: descreverEquipamento({
      aplicacao: linha.aplicacao,
      marca: linha.marca,
      modelo: linha.modelo,
      tipoMotor: linha.tipoMotor,
    }),
    totalCentavos: Math.max(0, Math.round(Number(linha.somaItens)) - linha.descontoCentavos),
    recebidoEm: linha.recebidoEm,
    entregueEm: linha.entregueEm,
  }))
}

export async function obterOs(id: string): Promise<OsCompleta | null> {
  const [linha] = await db
    .select({
      os: ordensServico,
      cliente: { id: clientes.id, nome: clientes.nome, telefone: clientes.telefone },
      equipamento: {
        id: equipamentos.id,
        tipoMotor: equipamentos.tipoMotor,
        aplicacao: equipamentos.aplicacao,
        marca: equipamentos.marca,
        modelo: equipamentos.modelo,
        numeroSerie: equipamentos.numeroSerie,
      },
    })
    .from(ordensServico)
    .innerJoin(clientes, eq(clientes.id, ordensServico.clienteId))
    .innerJoin(equipamentos, eq(equipamentos.id, ordensServico.equipamentoId))
    .where(eq(ordensServico.id, id))
    .limit(1)

  if (!linha) return null

  const [itens, historico, fotos, versoesOrcamento] = await Promise.all([
    db.select().from(osItens).where(eq(osItens.osId, id)).orderBy(asc(osItens.criadoEm)),
    db
      .select()
      .from(osHistorico)
      .where(eq(osHistorico.osId, id))
      .orderBy(asc(osHistorico.criadoEm)),
    db.select().from(osFotos).where(eq(osFotos.osId, id)).orderBy(asc(osFotos.criadoEm)),
    db
      .select()
      .from(osOrcamentoVersoes)
      .where(eq(osOrcamentoVersoes.osId, id))
      .orderBy(asc(osOrcamentoVersoes.versao)),
  ])

  return {
    ...linha.os,
    cliente: linha.cliente,
    equipamento: {
      id: linha.equipamento.id,
      descricao: descreverEquipamento(linha.equipamento),
      numeroSerie: linha.equipamento.numeroSerie,
    },
    itens,
    totais: calcularTotais(
      itens.map((item) => ({
        tipo: item.tipo,
        quantidade: item.quantidade,
        precoUnitarioCentavos: item.precoUnitarioCentavos,
      })),
      linha.os.descontoCentavos,
    ),
    historico,
    fotos,
    versoesOrcamento,
  }
}
