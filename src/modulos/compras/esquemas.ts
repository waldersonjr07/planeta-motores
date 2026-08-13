import { z } from 'zod'

const opcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))

export const entradaItemCompra = z
  .object({
    pecaId: z.string().uuid('Selecione a peça').optional(),
    /** Peça digitada na hora, cadastrada junto com a compra. */
    pecaNome: z.string().trim().min(1).optional(),
    unidade: z.enum(['un', 'L', 'mL']).default('un'),
    quantidade: z.number().positive('A quantidade precisa ser maior que zero'),
    custoUnitarioCentavos: z.number().int().min(0),
  })
  .refine((item) => item.pecaId || item.pecaNome, {
    message: 'Selecione a peça ou digite o nome de uma nova',
    path: ['pecaId'],
  })

export const entradaCompra = z.object({
  fornecedorId: z.string().uuid().nullable().optional(),
  /** Fornecedor digitado na hora. */
  fornecedorNome: z.string().trim().min(1).nullable().optional(),
  /** A OS que motivou a compra, quando a peça foi comprada sob demanda. */
  osId: z.string().uuid().nullable().optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data da compra'),
  numeroDocumento: opcional,
  observacoes: opcional,
  itens: z.array(entradaItemCompra).min(1, 'Inclua ao menos uma peça na compra'),
})

/*
 * Tipo de entrada, não de saída: `numeroDocumento`/`observacoes`/`unidade` usam
 * `.transform()`/`.default()`, que o Zod só resolve dentro do `.parse()`. Como
 * `registrarCompra` é chamado direto (sem passar pelo `entradaCompra.safeParse`)
 * pelos testes de integração e por quem mais compuser a função, o contrato real
 * dos parâmetros é o de entrada — mais permissivo — e não o de saída.
 *
 * `numeroDocumento`/`observacoes` precisam do ajuste extra abaixo: a entrada
 * pura do Zod só aceita `string | undefined` para eles, mas `acaoRegistrarCompra`
 * passa adiante o resultado já processado do `safeParse` — a saída do
 * `.transform()`, que é `string | null`. `registrarCompra` trata as duas formas
 * do mesmo jeito (sempre com `?? null`), então o tipo aceita ambas.
 */
export type EntradaCompra = Omit<
  z.input<typeof entradaCompra>,
  'numeroDocumento' | 'observacoes'
> & {
  numeroDocumento?: string | null
  observacoes?: string | null
}
export type EntradaItemCompra = z.input<typeof entradaItemCompra>
