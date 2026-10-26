type LimiteInfo = { count: number; resetEm: number }

const mapaRotas = new Map<string, LimiteInfo>()

/**
 * Limitador de taxa em memória para rotas específicas.
 *
 * Protege rotas computacionalmente custosas (geração de PDFs com React-PDF,
 * criação de arquivos ZIP com JSZip) contra esgotamento de memória e CPU
 * decorrentes de chamadas automatizadas repetitivas (DoS / Resource Exhaustion).
 *
 * @param identificador Chave única do chamador (ex: `pdf:${usuarioId}` ou `export:${origem}`)
 * @param maximo Quantidade máxima de requisições permitidas na janela
 * @param janelaMs Duração da janela temporal em milissegundos
 * @returns boolean `true` se a requisição está dentro do limite, `false` se estourou
 */
export function verificarLimiteDeRotas(
  identificador: string,
  maximo: number,
  janelaMs: number,
): boolean {
  const agora = Date.now()
  const registro = mapaRotas.get(identificador)

  if (!registro || agora > registro.resetEm) {
    mapaRotas.set(identificador, { count: 1, resetEm: agora + janelaMs })
    return true
  }

  if (registro.count >= maximo) {
    return false
  }

  registro.count++
  return true
}

/** Limpa todos os limites registrados (útil para testes automatizados). */
export function zerarLimitesDeRotas(): void {
  mapaRotas.clear()
}
