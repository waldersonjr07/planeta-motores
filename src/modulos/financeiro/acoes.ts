'use server'

import { revalidatePath } from 'next/cache'
import { parsearReais } from '@/lib/dinheiro'
import { falha, falhaDeValidacao, type Resultado } from '@/lib/resultado'
import { entradaDespesa, entradaPagamento } from './esquemas'
import {
  registrarDespesa,
  registrarPagamento,
  removerDespesa,
  removerPagamento,
} from './operacoes'

function revalidarFinanceiro(osId?: string) {
  revalidatePath('/financeiro')
  revalidatePath('/painel')
  revalidatePath('/ordens-servico')
  if (osId) revalidatePath(`/ordens-servico/${osId}`)
}

export async function acaoRegistrarPagamento(
  _anterior: Resultado<{ id: string }> | null,
  formulario: FormData,
): Promise<Resultado<{ id: string }>> {
  const osId = String(formulario.get('osId') ?? '')
  const valorCentavos = parsearReais(String(formulario.get('valor') ?? ''))
  if (valorCentavos === null) return falha('Informe um valor como 1.250,50.')

  const analise = entradaPagamento.safeParse({
    osId,
    valorCentavos,
    forma: String(formulario.get('forma') ?? ''),
    data: String(formulario.get('data') ?? ''),
    observacao: String(formulario.get('observacao') ?? ''),
  })
  if (!analise.success) return falhaDeValidacao(analise.error)

  const r = await registrarPagamento(analise.data)
  if (r.ok) revalidarFinanceiro(osId)
  return r
}

export async function acaoRemoverPagamento(formulario: FormData): Promise<void> {
  await removerPagamento(String(formulario.get('pagamentoId') ?? ''))
  revalidarFinanceiro(String(formulario.get('osId') ?? ''))
}

export async function acaoRegistrarDespesa(
  _anterior: Resultado<{ id: string }> | null,
  formulario: FormData,
): Promise<Resultado<{ id: string }>> {
  const valorCentavos = parsearReais(String(formulario.get('valor') ?? ''))
  if (valorCentavos === null) return falha('Informe um valor como 1.250,50.')

  const analise = entradaDespesa.safeParse({
    data: String(formulario.get('data') ?? ''),
    categoria: String(formulario.get('categoria') ?? 'outros'),
    descricao: String(formulario.get('descricao') ?? ''),
    valorCentavos,
    fornecedorId: String(formulario.get('fornecedorId') ?? '') || null,
  })
  if (!analise.success) return falhaDeValidacao(analise.error)

  const r = await registrarDespesa(analise.data)
  if (r.ok) revalidarFinanceiro()
  return r
}

export async function acaoRemoverDespesa(formulario: FormData): Promise<void> {
  await removerDespesa(String(formulario.get('despesaId') ?? ''))
  revalidarFinanceiro()
}
