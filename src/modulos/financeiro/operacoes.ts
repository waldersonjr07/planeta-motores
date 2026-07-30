import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { despesas, pagamentos } from '@/db/schema'
import { formatarReais } from '@/lib/dinheiro'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import { resumoDeCobrancaDaOs } from './consultas'
import type { EntradaDespesa, EntradaPagamento } from './esquemas'

export async function registrarPagamento(
  entrada: EntradaPagamento,
): Promise<Resultado<{ id: string }>> {
  const resumo = await resumoDeCobrancaDaOs(entrada.osId)

  if (resumo.totalCentavos <= 0) {
    return falha('Esta ordem de serviço ainda não tem valor lançado.')
  }

  // Pagar acima do saldo viraria crédito, que não existe no modelo. A mensagem
  // traz o saldo para a Lucilene não ter de calcular de cabeça.
  if (entrada.valorCentavos > resumo.saldoCentavos) {
    return falha(
      `O pagamento passa do saldo devedor, que é de ${formatarReais(resumo.saldoCentavos)}.`,
    )
  }

  const [criado] = await db
    .insert(pagamentos)
    .values(entrada)
    .returning({ id: pagamentos.id })

  return sucesso({ id: criado.id })
}

export async function removerPagamento(id: string): Promise<Resultado<null>> {
  const removidos = await db
    .delete(pagamentos)
    .where(eq(pagamentos.id, id))
    .returning({ id: pagamentos.id })

  if (removidos.length === 0) return falha('Pagamento não encontrado.')
  return sucesso(null)
}

export async function registrarDespesa(
  entrada: EntradaDespesa,
): Promise<Resultado<{ id: string }>> {
  const [criada] = await db
    .insert(despesas)
    .values({ ...entrada, fornecedorId: entrada.fornecedorId ?? null })
    .returning({ id: despesas.id })

  return sucesso({ id: criada.id })
}

export async function removerDespesa(id: string): Promise<Resultado<null>> {
  const removidas = await db
    .delete(despesas)
    .where(eq(despesas.id, id))
    .returning({ id: despesas.id })

  if (removidas.length === 0) return falha('Despesa não encontrada.')
  return sucesso(null)
}
