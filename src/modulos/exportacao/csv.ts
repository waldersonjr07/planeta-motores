/**
 * Serializador de CSV. Existe para que os dados da oficina nunca fiquem
 * reféns de provedor nenhum — oficina que perde a carteira de clientes não
 * reabre.
 */

import { formatarDataHoraIso } from '@/lib/datas'

const CARACTERES_FORMULA = /^[=+\-@\t\r]/

function escapar(valor: unknown): string {
  if (valor === null || valor === undefined) return ''

  let texto =
    valor instanceof Date
      ? formatarDataHoraIso(valor)
      : typeof valor === 'object'
        ? JSON.stringify(valor)
        : String(valor)

  // Proteção contra Formula / CSV Injection no Excel e Google Sheets:
  // Se o campo começar com '=', '+', '-', '@', '\t' ou '\r' e não for um número válido,
  // prefixamos com apóstrofo (') para forçar a planilha a tratar como texto literal.
  if (CARACTERES_FORMULA.test(texto) && !/^-?\d+(\.\d+)?$/.test(texto.trim())) {
    texto = `'${texto}`
  }

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
