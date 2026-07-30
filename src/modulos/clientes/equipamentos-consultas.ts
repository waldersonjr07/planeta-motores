import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { clientes, equipamentos } from '@/db/schema'
import { descreverEquipamento } from './equipamentos-descricao'

export type EquipamentoComDescricao = typeof equipamentos.$inferSelect & {
  descricao: string
}

export async function listarEquipamentosDoCliente(
  clienteId: string,
  incluirInativos = false,
): Promise<EquipamentoComDescricao[]> {
  const condicoes = [eq(equipamentos.clienteId, clienteId)]
  if (!incluirInativos) condicoes.push(eq(equipamentos.ativo, true))

  const linhas = await db
    .select()
    .from(equipamentos)
    .where(and(...condicoes))
    .orderBy(asc(equipamentos.aplicacao), asc(equipamentos.marca))

  return linhas.map((linha) => ({ ...linha, descricao: descreverEquipamento(linha) }))
}

export async function obterEquipamento(id: string) {
  const [linha] = await db.select().from(equipamentos).where(eq(equipamentos.id, id)).limit(1)
  return linha ?? null
}

export type EquipamentoParaSelecao = {
  clienteId: string
  clienteNome: string
  equipamentoId: string
  descricao: string
}

/**
 * Todos os equipamentos ativos com o nome do dono, para o seletor da nova OS.
 * A tela agrupa por cliente; carregar de uma vez evita selects dependentes
 * numa carteira desse tamanho.
 */
export async function listarEquipamentosParaSelecao(): Promise<EquipamentoParaSelecao[]> {
  const linhas = await db
    .select({
      clienteId: clientes.id,
      clienteNome: clientes.nome,
      equipamentoId: equipamentos.id,
      tipoMotor: equipamentos.tipoMotor,
      aplicacao: equipamentos.aplicacao,
      marca: equipamentos.marca,
      modelo: equipamentos.modelo,
    })
    .from(equipamentos)
    .innerJoin(clientes, eq(clientes.id, equipamentos.clienteId))
    .where(and(eq(equipamentos.ativo, true), eq(clientes.ativo, true)))
    .orderBy(asc(clientes.nome), asc(equipamentos.aplicacao))

  return linhas.map((linha) => ({
    clienteId: linha.clienteId,
    clienteNome: linha.clienteNome,
    equipamentoId: linha.equipamentoId,
    descricao: descreverEquipamento(linha),
  }))
}
