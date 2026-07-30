import { z } from 'zod'

const opcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))

export const entradaItemCompra = z.object({
  pecaId: z.string().uuid('Selecione a peça'),
  quantidade: z.number().positive('A quantidade precisa ser maior que zero'),
  custoUnitarioCentavos: z.number().int().min(0),
})

export const entradaCompra = z.object({
  fornecedorId: z.string().uuid().nullable().optional(),
  /** A OS que motivou a compra, quando a peça foi comprada sob demanda. */
  osId: z.string().uuid().nullable().optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data da compra'),
  numeroDocumento: opcional,
  observacoes: opcional,
  itens: z.array(entradaItemCompra).min(1, 'Inclua ao menos uma peça na compra'),
})

export type EntradaCompra = z.infer<typeof entradaCompra>
export type EntradaItemCompra = z.infer<typeof entradaItemCompra>
