'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { parsearReais } from '@/lib/dinheiro'
import { parsearQuantidade } from '@/lib/quantidade'
import { falha, falhaDeValidacao, type Resultado } from '@/lib/resultado'
import { entradaCompra } from './esquemas'
import { registrarCompra } from './operacoes'

/**
 * O formulário envia linhas repetidas (`pecaId`, `quantidade`, `custo`) e o
 * navegador as entrega na mesma ordem em que aparecem — é assim que as três
 * listas voltam a formar itens.
 */
export async function acaoRegistrarCompra(
  _anterior: Resultado<{ id: string }> | null,
  formulario: FormData,
): Promise<Resultado<{ id: string }>> {
  const idsDePeca = formulario.getAll('pecaId').map(String)
  const quantidades = formulario.getAll('quantidade').map(String)
  const custos = formulario.getAll('custo').map(String)

  const itens = []
  for (let i = 0; i < idsDePeca.length; i++) {
    if (!idsDePeca[i]) continue

    const quantidade = parsearQuantidade(quantidades[i] ?? '')
    if (quantidade === null) return falha(`Informe a quantidade da linha ${i + 1}.`)

    const custo = parsearReais(custos[i] ?? '')
    if (custo === null) return falha(`Informe o custo da linha ${i + 1}.`)

    itens.push({ pecaId: idsDePeca[i], quantidade, custoUnitarioCentavos: custo })
  }

  const fornecedorId = String(formulario.get('fornecedorId') ?? '')
  const osId = String(formulario.get('osId') ?? '')

  const analise = entradaCompra.safeParse({
    fornecedorId: fornecedorId || null,
    osId: osId || null,
    data: String(formulario.get('data') ?? ''),
    numeroDocumento: String(formulario.get('numeroDocumento') ?? ''),
    observacoes: String(formulario.get('observacoes') ?? ''),
    itens,
  })
  if (!analise.success) return falhaDeValidacao(analise.error)

  const r = await registrarCompra(analise.data)
  if (!r.ok) return r

  revalidatePath('/compras')
  revalidatePath('/estoque')
  redirect('/compras')
}
