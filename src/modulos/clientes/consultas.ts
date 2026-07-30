import { and, asc, eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { clientes, equipamentos } from '@/db/schema'
import { apenasDigitos } from '@/lib/validacao'

export type ClienteResumo = {
  id: string
  nome: string
  telefone: string | null
  cidade: string | null
  ativo: boolean
  quantidadeEquipamentos: number
}

export async function listarClientes(
  filtro: { busca?: string; incluirInativos?: boolean } = {},
): Promise<ClienteResumo[]> {
  const condicoes = []
  if (!filtro.incluirInativos) condicoes.push(eq(clientes.ativo, true))

  const busca = filtro.busca?.trim()
  if (busca) {
    const digitos = apenasDigitos(busca)
    const porNome = ilike(clientes.nome, `%${busca}%`)
    // Compara documento por dígitos: o usuário digita com pontuação, o banco guarda sem.
    condicoes.push(
      digitos ? or(porNome, ilike(clientes.documento, `%${digitos}%`))! : porNome,
    )
  }

  return db
    .select({
      id: clientes.id,
      nome: clientes.nome,
      telefone: clientes.telefone,
      cidade: clientes.cidade,
      ativo: clientes.ativo,
      quantidadeEquipamentos: sql<number>`count(${equipamentos.id})::int`,
    })
    .from(clientes)
    .leftJoin(equipamentos, eq(equipamentos.clienteId, clientes.id))
    .where(condicoes.length ? and(...condicoes) : undefined)
    .groupBy(clientes.id)
    .orderBy(asc(clientes.nome))
}

export async function obterCliente(id: string) {
  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1)
  return cliente ?? null
}
