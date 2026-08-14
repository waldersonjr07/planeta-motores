'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { parsearReais } from '@/lib/dinheiro'
import { parsearQuantidade } from '@/lib/quantidade'
import {
  falha,
  falhaDeValidacao,
  type EcoDoFormulario,
  type Resultado,
} from '@/lib/resultado'
import { exigirUsuario } from '@/modulos/auth/guarda'
import { entradaCompra } from './esquemas'
import { registrarCompra } from './operacoes'

/** Os `name` que a tela repete uma vez por linha de item. */
type LinhasDaCompra = {
  pecaId: string[]
  pecaNome: string[]
  unidadeNova: string[]
  quantidade: string[]
  custo: string[]
}

function linhasDoFormulario(formulario: FormData): LinhasDaCompra {
  const lista = (chave: string) => formulario.getAll(chave).map(String)
  return {
    pecaId: lista('pecaId'),
    pecaNome: lista('pecaNome'),
    unidadeNova: lista('unidadeNova'),
    quantidade: lista('quantidade'),
    custo: lista('custo'),
  }
}

/**
 * O que a tela precisa para se remontar igual depois de a validação reprovar.
 * Cabeçalho em `valores`; item em `listas`, porque as chaves de linha se
 * repetem e um objeto simples guardaria só a última linha digitada.
 */
function ecoDaCompra(formulario: FormData, linhas: LinhasDaCompra): EcoDoFormulario {
  const valores: Record<string, string> = {}
  for (const [chave, valor] of formulario.entries()) {
    if (chave in linhas) continue
    valores[chave] = String(valor)
  }
  return { valores, listas: linhas }
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
  await exigirUsuario()

  const linhas = linhasDoFormulario(formulario)
  const eco = ecoDaCompra(formulario, linhas)

  const itens = []
  for (let i = 0; i < linhas.quantidade.length; i++) {
    const pecaId = linhas.pecaId[i] ?? ''
    const pecaNome = (linhas.pecaNome[i] ?? '').trim()
    // Linha em branco: nem escolheu, nem digitou. Ignora sem reclamar.
    if (!pecaId && !pecaNome) continue

    const quantidade = parsearQuantidade(linhas.quantidade[i] ?? '')
    if (quantidade === null) return falha(`Informe a quantidade da linha ${i + 1}.`, eco)

    const custo = parsearReais(linhas.custo[i] ?? '')
    if (custo === null) return falha(`Informe o custo da linha ${i + 1}.`, eco)

    itens.push({
      ...(pecaId ? { pecaId } : { pecaNome }),
      unidade: (linhas.unidadeNova[i] || 'un') as 'un' | 'L' | 'mL',
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
  if (!analise.success) return falhaDeValidacao(analise.error, eco)

  const r = await registrarCompra(analise.data)
  if (!r.ok) return r

  revalidatePath('/compras')
  revalidatePath('/estoque')
  redirect('/compras')
}
