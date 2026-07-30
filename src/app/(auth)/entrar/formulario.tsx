'use client'

import { useActionState } from 'react'
import { entrar } from '@/modulos/auth/acoes'

export function FormularioLogin() {
  const [resultado, acao, pendente] = useActionState(entrar, null)

  return (
    <form action={acao} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-xl font-semibold">Planeta Motores</h1>

      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Senha
        <input
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>

      {resultado && !resultado.ok && (
        <p role="alert" className="text-sm text-red-600">
          {resultado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-60"
      >
        {pendente ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
