/**
 * Forma canônica para comparar nome digitado com nome cadastrado. Sem isso,
 * "Óleo 2T" e "oleo 2t" virariam duas peças diferentes no cadastro na hora.
 */
export function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    // `\p{Diacritic}` em vez da faixa U+0300–U+036F escrita à mão: o padrão
    // fica todo em ASCII, sem caractere combinante invisível no arquivo.
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
}
