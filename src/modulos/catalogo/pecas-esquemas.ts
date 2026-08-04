import { z } from 'zod'
import { parsearQuantidade } from '@/lib/quantidade'
import { textoObrigatorio } from '@/lib/validacao'

const quantidadeDigitada = z
  .string()
  .trim()
  .optional()
  .transform((valor, contexto) => {
    if (!valor) return 0
    const numero = parsearQuantidade(valor)
    if (numero === null) {
      contexto.addIssue({ code: 'custom', message: 'Informe uma quantidade como 0,5' })
      return z.NEVER
    }
    return numero
  })

export const entradaPeca = z.object({
  nome: textoObrigatorio('Nome'),
  marca: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  unidade: z.enum(['un', 'L', 'kg', 'm']),
  // Caixa de seleção não é enviada quando desmarcada; ausência significa desligado.
  controlaSaldo: z
    .string()
    .optional()
    .transform((v) => v === 'on' || v === 'true'),
  quantidadeMinima: quantidadeDigitada,
})

export type EntradaPecaFormulario = z.infer<typeof entradaPeca>

/**
 * Peça não tem preço: a oficina não trabalha com tabela de peça, e o valor
 * cobrado é definido em cada orçamento. Aqui só existe o que é de estoque.
 */
export type EntradaPeca = {
  nome: string
  marca: string | null
  unidade: 'un' | 'L' | 'kg' | 'm'
  controlaSaldo: boolean
  quantidadeMinima: string
}

export function paraEntradaPeca(dados: EntradaPecaFormulario): EntradaPeca {
  return {
    nome: dados.nome,
    marca: dados.marca,
    unidade: dados.unidade,
    controlaSaldo: dados.controlaSaldo,
    // numeric é escrito como texto para não perder precisão no caminho.
    quantidadeMinima: dados.quantidadeMinima.toFixed(3),
  }
}
