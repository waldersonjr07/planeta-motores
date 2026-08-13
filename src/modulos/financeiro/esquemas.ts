import { z } from 'zod'

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data')

export const entradaPagamento = z.object({
  osId: z.string().uuid('Ordem de serviço inválida'),
  valorCentavos: z.number().int().positive('O valor precisa ser maior que zero'),
  forma: z.enum(['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia']),
  data: dataIso,
  observacao: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
})

export type EntradaPagamento = z.infer<typeof entradaPagamento>

export const entradaDespesa = z.object({
  data: dataIso,
  categoria: z.enum(['ferramenta', 'aluguel', 'energia', 'combustivel', 'outros']),
  descricao: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  valorCentavos: z.number().int().positive('O valor precisa ser maior que zero'),
  fornecedorId: z.string().uuid().nullable().optional(),
})

export type EntradaDespesa = z.infer<typeof entradaDespesa>

export const FORMAS_PAGAMENTO = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_debito: 'Cartão de débito',
  cartao_credito: 'Cartão de crédito',
  transferencia: 'Transferência',
} as const

export const CATEGORIAS_DESPESA = {
  ferramenta: 'Ferramenta',
  aluguel: 'Aluguel',
  energia: 'Energia',
  combustivel: 'Combustível',
  outros: 'Outros',
} as const
