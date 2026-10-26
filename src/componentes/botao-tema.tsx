'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function BotaoTema() {
  const { setTheme, resolvedTheme } = useTheme()
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    setMontado(true)
  }, [])

  if (!montado) {
    return (
      <div className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm text-slate-600 dark:text-zinc-400 opacity-60">
        <span className="flex items-center gap-2">
          <span className="inline-block h-4 w-4" />
          <span>Tema</span>
        </span>
      </div>
    )
  }

  const ehEscuro = resolvedTheme === 'dark'

  function alternarTema() {
    setTheme(ehEscuro ? 'light' : 'dark')
  }

  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-label={ehEscuro ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={ehEscuro ? 'Alternar para Modo Diurno (Claro)' : 'Alternar para Modo Noturno (Escuro)'}
      className="flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
    >
      <span className="flex items-center gap-2 font-medium">
        {ehEscuro ? (
          // Ícone de Sol
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-400"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        ) : (
          // Ícone de Lua
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-700"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        )}
        <span>{ehEscuro ? 'Modo Noturno' : 'Modo Diurno'}</span>
      </span>

      <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
        {ehEscuro ? 'Escuro' : 'Claro'}
      </span>
    </button>
  )
}
