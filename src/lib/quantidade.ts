/**
 * O driver do Postgres devolve `numeric` como texto ("0.500"). Estas duas
 * funções são a única fronteira entre esse texto e o número que o usuário vê.
 */
export function formatarQuantidade(valor: string | number): string {
  const numero = typeof valor === 'string' ? Number(valor) : valor
  if (!Number.isFinite(numero)) return '0'
  // Até três casas, sem zeros à direita: 2.000 → "2", 0.500 → "0,5".
  return numero
    .toFixed(3)
    .replace(/\.?0+$/, '')
    .replace('.', ',')
}

export function parsearQuantidade(texto: string): number | null {
  const limpo = texto.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,3})?$/.test(limpo)) return null
  const numero = Number(limpo)
  return Number.isFinite(numero) ? numero : null
}
