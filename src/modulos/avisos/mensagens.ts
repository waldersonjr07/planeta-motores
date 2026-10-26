/**
 * Montagem de mensagem e link do WhatsApp. Puro de propósito: é importado por
 * componente de cliente e precisa ficar longe de qualquer coisa de servidor.
 */

export type ValoresDaMensagem = {
  cliente?: string
  numero?: string
  equipamento?: string
  total?: string
  saldo?: string
}

/**
 * Troca `{{marcador}}` pelo valor. Marcador sem valor vira texto vazio — ver
 * `{{saldo}}` cru numa mensagem enviada ao cliente é pior do que a frase
 * ficar um pouco truncada.
 */
export function preencherModelo(modelo: string, valores: ValoresDaMensagem): string {
  return modelo.replace(/\{\{(\w+)\}\}/g, (_, chave: string) => {
    const valor = valores[chave as keyof ValoresDaMensagem]
    return valor ?? ''
  })
}

/** Monta o link do WhatsApp com número e texto já preenchidos. */
export function linkDoWhatsapp(telefone: string, mensagem: string): string {
  const digitos = telefone.replace(/\D/g, '')
  // Número brasileiro tem 10 (fixo) ou 11 dígitos (celular) com DDD.
  // Se tiver 11 dígitos ou menos, sempre recebe o DDI 55 (evitando que DDD 55 seja tratado como DDI).
  const comDdi =
    digitos.length <= 11
      ? `55${digitos}`
      : digitos.startsWith('55')
        ? digitos
        : `55${digitos}`
  return `https://wa.me/${comDdi}?text=${encodeURIComponent(mensagem)}`
}
