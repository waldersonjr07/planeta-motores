import { z } from 'zod'
import {
  cepOpcional,
  documentoOpcional,
  telefoneOpcional,
  textoObrigatorio,
} from '@/lib/validacao'

// Aceita a chave ausente: campo opcional não enviado pelo formulário é nulo,
// não erro de validação.
const opcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))

export const entradaCliente = z.object({
  nome: textoObrigatorio('Nome'),
  tipoPessoa: z.enum(['fisica', 'juridica']),
  documento: documentoOpcional,
  telefone: telefoneOpcional,
  email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: 'Informe um e-mail válido',
    })
    .transform((v) => (v ? v.toLowerCase() : null)),
  logradouro: opcional,
  numero: opcional,
  complemento: opcional,
  bairro: opcional,
  cidade: opcional,
  uf: opcional,
  cep: cepOpcional,
  observacoes: opcional,
})

export type EntradaCliente = z.infer<typeof entradaCliente>

/**
 * Cadastro rápido, feito na abertura da OS. Só o que dá para perguntar com o
 * cliente na frente e o motor na bancada — o resto se completa depois, na
 * ficha. Sem isso a Lucilene teria de sair da OS para cadastrar e voltar.
 */
export const entradaClienteRapido = z.object({
  nome: textoObrigatorio('Nome do cliente'),
  documento: documentoOpcional,
  telefone: telefoneOpcional,
})

export type EntradaClienteRapido = z.infer<typeof entradaClienteRapido>
