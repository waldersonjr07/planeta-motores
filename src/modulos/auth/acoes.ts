'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { falhaDeValidacao, type Resultado } from '@/lib/resultado'
import { autenticar } from './autenticacao'
import { entradaLogin } from './esquemas'
import { COOKIE_SESSAO } from './guarda'
import { DURACAO_SESSAO_MS, encerrarSessao } from './sessao'

function entradaLoginDoFormulario(
  formulario: FormData,
): Resultado<{ email: string; senha: string }> {
  const analise = entradaLogin.safeParse({
    email: String(formulario.get('email') ?? ''),
    senha: String(formulario.get('senha') ?? ''),
  })
  return analise.success
    ? { ok: true, dados: analise.data }
    : falhaDeValidacao(analise.error)
}

export async function entrar(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  const analise = entradaLoginDoFormulario(formulario)
  if (!analise.ok) return analise

  const autenticacao = await autenticar(analise.dados.email, analise.dados.senha)
  if (!autenticacao.ok) return autenticacao

  const jarra = await cookies()
  jarra.set(COOKIE_SESSAO, autenticacao.dados, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DURACAO_SESSAO_MS / 1000,
  })

  // redirect() encerra a execução lançando internamente; nada depois roda.
  redirect('/ordens-servico')
}

export async function sair(): Promise<void> {
  const jarra = await cookies()
  const token = jarra.get(COOKIE_SESSAO)?.value
  if (token) await encerrarSessao(token)
  jarra.delete(COOKIE_SESSAO)
  redirect('/entrar')
}
