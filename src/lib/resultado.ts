import type { ZodError } from 'zod'

/**
 * Retorno de toda Server Action. Erro esperado é dado de retorno, não exceção:
 * a tela precisa exibir a mensagem sem derrubar a navegação.
 */
export type Resultado<T> =
  | { ok: true; dados: T }
  | {
      ok: false
      erro: string
      campos?: Record<string, string>
      /**
       * Eco do que foi enviado. O React 19 reseta o formulário quando a ação
       * termina, então o valor só volta à tela se a própria ação o devolver.
       */
      valores?: Record<string, string>
    }

export function sucesso<T>(dados: T): Resultado<T> {
  return { ok: true, dados }
}

export function falha(
  erro: string,
  campos?: Record<string, string>,
): Resultado<never> {
  return campos ? { ok: false, erro, campos } : { ok: false, erro }
}

export function falhaDeValidacao(
  erro: ZodError,
  valores?: Record<string, string>,
): Resultado<never> {
  const campos: Record<string, string> = {}
  for (const problema of erro.issues) {
    const campo = problema.path.join('.')
    if (campo && !(campo in campos)) campos[campo] = problema.message
  }
  return {
    ok: false,
    erro: 'Confira os campos destacados.',
    campos,
    ...(valores ? { valores } : {}),
  }
}
