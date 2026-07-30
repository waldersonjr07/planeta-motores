import { z } from 'zod'

const opcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))

export const entradaOs = z.object({
  clienteId: z.string().uuid('Selecione o cliente'),
  equipamentoId: z.string().uuid('Selecione o equipamento'),
  problemaRelatado: opcional,
  acessoriosRecebidos: opcional,
  observacoes: opcional,
})

export type EntradaOs = z.infer<typeof entradaOs>

export const entradaItemOs = z.object({
  tipo: z.enum(['peca', 'servico']),
  referenciaId: z.string().uuid('Selecione o item'),
  quantidade: z.number().positive('A quantidade precisa ser maior que zero'),
  /** Quando informado, tem precedência sobre o preço do catálogo. */
  precoUnitarioCentavos: z.number().int().min(0).optional(),
})

export type EntradaItemOs = z.infer<typeof entradaItemOs>
