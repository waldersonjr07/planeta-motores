const formatador = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/** Converte centavos inteiros no texto exibido ao usuário. */
export function formatarReais(centavos: number): string {
  // O Intl usa espaço inquebrável (U+00A0) depois de "R$". Normalizamos para
  // espaço comum, senão comparação de texto e busca na tela ficam
  // imprevisíveis — inclusive nos testes.
  return formatador.format(centavos / 100).replace(/ /g, ' ')
}

const PADRAO = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/

/** Converte o que o usuário digitou em centavos inteiros. `null` se inválido. */
export function parsearReais(texto: string): number | null {
  const limpo = texto.trim().replace(/^R\$\s*/, '')
  if (!PADRAO.test(limpo)) return null
  const valor = Number(limpo.replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(valor)) return null
  return Math.round(valor * 100)
}
