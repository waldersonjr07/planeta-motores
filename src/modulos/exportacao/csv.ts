/**
 * Serializador de CSV. Existe para que os dados da oficina nunca fiquem
 * reféns de provedor nenhum — oficina que perde a carteira de clientes não
 * reabre.
 */

function escapar(valor: unknown): string {
  if (valor === null || valor === undefined) return ''

  const texto =
    valor instanceof Date
      ? valor.toISOString()
      : typeof valor === 'object'
        ? JSON.stringify(valor)
        : String(valor)

  // Aspas, vírgula e quebra de linha obrigam o campo a ir entre aspas, com as
  // aspas internas duplicadas.
  if (/[",\r\n]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`
  return texto
}

export function paraCsv(linhas: Record<string, unknown>[], colunas?: string[]): string {
  const cabecalho = colunas ?? (linhas.length > 0 ? Object.keys(linhas[0]) : [])
  if (cabecalho.length === 0) return ''

  const corpo = linhas.map((linha) => cabecalho.map((coluna) => escapar(linha[coluna])).join(','))

  return [cabecalho.join(','), ...corpo].join('\r\n')
}
