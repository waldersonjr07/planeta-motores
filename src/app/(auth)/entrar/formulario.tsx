'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { entrar } from '@/modulos/auth/acoes'

const CONTROLE =
  'w-full rounded-md border border-borda-forte bg-superficie px-3 py-2 text-sm'

export function FormularioLogin() {
  const [resultado, acao, pendente] = useActionState(entrar, null)

  return (
    <form action={acao} className="flex w-full max-w-sm flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Planeta Motores</h1>
        <p className="mt-1 text-sm text-tinta-suave">Motores 2 e 4 tempos</p>
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-tinta-suave">
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
          <span className="text-xs font-medium uppercase tracking-wide text-tinta-suave">
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
