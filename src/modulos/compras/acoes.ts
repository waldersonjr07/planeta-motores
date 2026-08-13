'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { parsearReais } from '@/lib/dinheiro'
import { parsearQuantidade } from '@/lib/quantidade'
import { falha, falhaDeValidacao, type Resultado } from '@/lib/resultado'
import { entradaCompra } from './esquemas'
import { registrarCompra } from './operacoes'

function objetoDoFormulario(formulario: FormData): Record<string, string> {
  const dados: Record<string, string> = {}
  for (const [chave, valor] of formulario.entries()) dados[chave] = String(valor)
  return dados
}

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
  const nomesDePeca = formulario.getAll('pecaNome').map(String)
  const unidades = formulario.getAll('unidadeNova').map(String)
  const quantidades = formulario.getAll('quantidade').map(String)
  const custos = formulario.getAll('custo').map(String)

  const itens = []
  for (let i = 0; i < quantidades.length; i++) {
    const pecaId = idsDePeca[i] ?? ''
    const pecaNome = (nomesDePeca[i] ?? '').trim()
    // Linha em branco: nem escolheu, nem digitou. Ignora sem reclamar.
    if (!pecaId && !pecaNome) continue

    const quantidade = parsearQuantidade(quantidades[i] ?? '')
    if (quantidade === null) return falha(`Informe a quantidade da linha ${i + 1}.`)

    const custo = parsearReais(custos[i] ?? '')
    if (custo === null) return falha(`Informe o custo da linha ${i + 1}.`)

    itens.push({
      ...(pecaId ? { pecaId } : { pecaNome }),
      unidade: (unidades[i] || 'un') as 'un' | 'L' | 'mL',
      quantidade,
      custoUnitarioCentavos: custo,
    })
  }

  const fornecedorId = String(formulario.get('fornecedorId') ?? '')
  const fornecedorNome = String(formulario.get('fornecedorNome') ?? '').trim()
  const osId = String(formulario.get('osId') ?? '')

  const analise = entradaCompra.safeParse({
    fornecedorId: fornecedorId || null,
    fornecedorNome: fornecedorNome || null,
    osId: osId || null,
    data: String(formulario.get('data') ?? ''),
    numeroDocumento: String(formulario.get('numeroDocumento') ?? ''),
    observacoes: String(formulario.get('observacoes') ?? ''),
    itens,
  })
  if (!analise.success) return falhaDeValidacao(analise.error, objetoDoFormulario(formulario))

  const r = await registrarCompra(analise.data)
  if (!r.ok) return r

  revalidatePath('/compras')
  revalidatePath('/estoque')
  redirect('/compras')
}
