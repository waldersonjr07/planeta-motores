import { z } from 'zod'

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

function opcionalComDigitos(tamanhosAceitos: number[], mensagem: string) {
  return z
    .string()
    .optional()
    // Campo opcional precisa aceitar a chave ausente: formulário que não tem o
    // campo não envia nada, e reprovar isso quebraria a tela por nada.
    .transform((v) => apenasDigitos(v ?? ''))
    .refine((v) => v === '' || tamanhosAceitos.includes(v.length), { message: mensagem })
    .transform((v) => (v === '' ? null : v))
}

export const documentoOpcional = opcionalComDigitos(
  [11, 14],
  'Informe um CPF com 11 dígitos ou um CNPJ com 14 dígitos',
)

export const telefoneOpcional = opcionalComDigitos([10, 11], 'Informe o telefone com DDD')

export const cepOpcional = opcionalComDigitos([8], 'O CEP tem 8 dígitos')

export function textoObrigatorio(rotulo: string) {
  return z.string().trim().min(1, `${rotulo} é obrigatório`)
}
