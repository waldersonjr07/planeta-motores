import { z } from 'zod'
import { telefoneOpcional, textoObrigatorio } from '@/lib/validacao'

// Aceita a chave ausente: campo opcional não enviado é nulo, não erro.
const opcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))

export const entradaFornecedor = z.object({
  nome: textoObrigatorio('Nome'),
  telefone: telefoneOpcional,
  email: opcional,
  observacoes: opcional,
})

export type EntradaFornecedor = z.infer<typeof entradaFornecedor>
