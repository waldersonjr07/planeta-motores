'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { entrar } from '@/modulos/auth/acoes'

const CONTROLE =
  'w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors'

export function FormularioLogin() {
  const [resultado, acao, pendente] = useActionState(entrar, null)

  return (
    <form action={acao} className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            E-mail
          </span>
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            className={CONTROLE}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Senha
          </span>
          <input
            name="senha"
            type="password"
            autoComplete="current-password"
            required
            className={CONTROLE}
          />
        </label>
      </div>

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}

      <Botao type="submit" disabled={pendente}>
        {pendente ? 'Entrando…' : 'Entrar'}
      </Botao>
    </form>
  )
}
