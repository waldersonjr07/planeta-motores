import { z } from 'zod'
import { documentoOpcional, telefoneOpcional, textoObrigatorio } from '@/lib/validacao'

// Aceita a chave ausente: campo opcional não enviado é nulo, não erro.
const opcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))

export const entradaConfiguracoes = z.object({
  empresaNome: textoObrigatorio('Nome da empresa'),
  empresaCnpj: documentoOpcional,
  empresaTelefone: telefoneOpcional,
  empresaEndereco: opcional,
  orcamentoValidadeDias: z.coerce
    .number()
    .int('Informe um número inteiro de dias')
    .min(1, 'A validade precisa ser de pelo menos um dia'),
  modeloMsgOrcamento: textoObrigatorio('Mensagem de orçamento'),
  modeloMsgPronto: textoObrigatorio('Mensagem de serviço pronto'),
  modeloMsgCobranca: textoObrigatorio('Mensagem de cobrança'),
})

export type EntradaConfiguracoes = z.infer<typeof entradaConfiguracoes>
