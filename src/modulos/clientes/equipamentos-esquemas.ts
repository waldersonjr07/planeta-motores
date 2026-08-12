import { z } from 'zod'

// Aceita a chave ausente: o formulário da ficha não traz todos os campos.
const opcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))

export const entradaEquipamento = z
  .object({
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
    aplicacaoOutra: opcional,
    marca: opcional,
    modelo: opcional,
    numeroSerie: opcional,
    observacoes: opcional,
  })
  .superRefine((dados, ctx) => {
    // Sem isso o cadastro acumula equipamento "Outro" que ninguém identifica.
    if (dados.aplicacao === 'outro' && !dados.aplicacaoOutra) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['aplicacaoOutra'],
        message: 'Diga qual é a máquina',
      })
    }
  })
  .transform((dados) => ({
    ...dados,
    // Trocou "Outro" por uma aplicação da lista: o texto anterior não fica.
    aplicacaoOutra: dados.aplicacao === 'outro' ? dados.aplicacaoOutra : null,
  }))

export type EntradaEquipamento = z.infer<typeof entradaEquipamento>
