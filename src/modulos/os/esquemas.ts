import { z } from 'zod'
import { documentoOpcional, telefoneOpcional, textoObrigatorio } from '@/lib/validacao'

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

/**
 * Abertura de OS com cliente e máquina digitados na hora. Existe porque na
 * correria não dá para parar, cadastrar o cliente, cadastrar o equipamento e
 * só então abrir a OS — o cadastro sai junto, numa tela só.
 */
export const entradaOsRapida = z.object({
  nomeCliente: textoObrigatorio('Nome do cliente'),
  documentoCliente: documentoOpcional,
  telefoneCliente: telefoneOpcional,
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
  problemaRelatado: opcional,
  acessoriosRecebidos: opcional,
  observacoes: opcional,
})

export type EntradaOsRapida = z.infer<typeof entradaOsRapida>

/**
 * Um item vem do catálogo (`referenciaId`) ou é digitado na hora (`descricao`).
 * O item digitado existe porque a mão de obra da oficina tem valor variado e
 * nem tudo cabe numa tabela de preço — sem ele, a Lucilene teria de poluir o
 * catálogo com serviço que só serve para uma OS.
 */
export const entradaItemOs = z
  .object({
    tipo: z.enum(['peca', 'servico']),
    referenciaId: z.string().uuid('Selecione o item').optional(),
    descricao: z.string().trim().min(1, 'Descreva o item').optional(),
    quantidade: z.number().positive('A quantidade precisa ser maior que zero'),
    /** Só o serviço de catálogo herda preço; peça e item digitado exigem valor. */
    precoUnitarioCentavos: z.number().int().min(0).optional(),
  })
  .refine((dados) => dados.referenciaId || dados.descricao, {
    message: 'Selecione um item do catálogo ou descreva o item',
    path: ['descricao'],
  })
  .refine(
    (dados) =>
      // Peça não tem preço de tabela: sem valor informado, entraria zerada.
      (dados.tipo === 'servico' && dados.referenciaId) ||
      dados.precoUnitarioCentavos !== undefined,
    { message: 'Informe o valor do item', path: ['precoUnitarioCentavos'] },
  )

export type EntradaItemOs = z.infer<typeof entradaItemOs>
