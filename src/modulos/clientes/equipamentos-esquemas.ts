import { z } from 'zod'

// Aceita a chave ausente: o formulário da ficha não traz todos os campos.
const opcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))

export const entradaEquipamento = z.object({
  clienteId: z.string().uuid('Selecione o cliente'),
  tipoMotor: z.enum(['2T', '4T']),
  aplicacao: z.enum([
    'rocadeira',
    'motosserra',
    'motobomba',
    'gerador',
    'soprador',
    'outro',
  ]),
  marca: opcional,
  modelo: opcional,
  numeroSerie: opcional,
  observacoes: opcional,
})

export type EntradaEquipamento = z.infer<typeof entradaEquipamento>
