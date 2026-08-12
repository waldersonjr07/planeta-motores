import { z } from 'zod'

// Aceita a chave ausente: o formulário da ficha não traz todos os campos.
const opcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))

/**
 * Regra de "outro": `aplicacaoOutra` é obrigatório quando `aplicacao` é
 * 'outro' e é sempre anulado nas demais aplicações. Usada tanto na ficha do
 * equipamento quanto no cadastro rápido da OS (`src/modulos/os/esquemas.ts`)
 * — extraída aqui, o módulo dono do conceito de equipamento, para que as
 * duas telas não possam validar diferente por esquecimento se a regra mudar.
 */
export function esquemaComAplicacaoOutra<
  Shape extends z.ZodRawShape & { aplicacao: z.ZodTypeAny; aplicacaoOutra: z.ZodTypeAny },
>(shape: Shape) {
  return z
    .object(shape)
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
}

export const entradaEquipamento = esquemaComAplicacaoOutra({
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

export type EntradaEquipamento = z.infer<typeof entradaEquipamento>
