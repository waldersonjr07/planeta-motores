import { z } from 'zod'
import { parsearReais } from '@/lib/dinheiro'
import { textoObrigatorio } from '@/lib/validacao'

/** Campo de dinheiro digitado: vazio vale zero, texto inválido é recusado. */
export const precoDigitado = z
  .string()
  .trim()
  .optional()
  .transform((valor, contexto) => {
    if (!valor) return 0
    const centavos = parsearReais(valor)
    if (centavos === null) {
      contexto.addIssue({ code: 'custom', message: 'Informe um valor como 1.250,50' })
      return z.NEVER
    }
    return centavos
  })

export const entradaServico = z.object({
  nome: textoObrigatorio('Nome'),
  descricao: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  precoPadrao: precoDigitado,
})

export type EntradaServicoFormulario = z.infer<typeof entradaServico>

export type EntradaServico = {
  nome: string
  descricao: string | null
  precoPadraoCentavos: number
}

export function paraEntradaServico(dados: EntradaServicoFormulario): EntradaServico {
  return {
    nome: dados.nome,
    descricao: dados.descricao,
    precoPadraoCentavos: dados.precoPadrao,
  }
}
