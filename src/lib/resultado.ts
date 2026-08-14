import type { ZodError } from 'zod'

/**
 * Eco do que foi enviado. O React 19 reseta o formulário quando a ação
 * termina, então o valor só volta à tela se a própria ação o devolver.
 *
 * `valores` guarda campo de valor único. `listas` existe para o formulário que
 * repete a mesma `name` linha a linha — a compra —, onde um
 * `Record<string, string>` colapsaria tudo na última linha digitada.
 */
export type EcoDoFormulario = {
  valores?: Record<string, string>
  listas?: Record<string, string[]>
}

/**
 * Retorno de toda Server Action. Erro esperado é dado de retorno, não exceção:
 * a tela precisa exibir a mensagem sem derrubar a navegação.
 */
export type Resultado<T> =
  | { ok: true; dados: T }
  | ({
      ok: false
      erro: string
      campos?: Record<string, string>
    } & EcoDoFormulario)

export function sucesso<T>(dados: T): Resultado<T> {
  return { ok: true, dados }
}

export function falha(
  erro: string,
  extras?: { campos?: Record<string, string> } & EcoDoFormulario,
): Resultado<never> {
  // Chave ausente em vez de chave com `undefined`: quem lê o resultado no
  // teste compara o objeto inteiro.
  return {
    ok: false,
    erro,
    ...(extras?.campos ? { campos: extras.campos } : {}),
    ...(extras?.valores ? { valores: extras.valores } : {}),
    ...(extras?.listas ? { listas: extras.listas } : {}),
  }
}

export function falhaDeValidacao(erro: ZodError, eco?: EcoDoFormulario): Resultado<never> {
  const campos: Record<string, string> = {}
  for (const problema of erro.issues) {
    const campo = problema.path.join('.')
    if (campo && !(campo in campos)) campos[campo] = problema.message
  }
  return falha('Confira os campos destacados.', { campos, ...eco })
}
