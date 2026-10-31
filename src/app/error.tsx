'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Emblema } from '@/componentes/emblema'

export default function ErroGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Erro não tratado na aplicação:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-zinc-950 transition-colors">
      <div className="flex flex-col items-center max-w-lg p-8 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <Emblema tamanho={56} />
        <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-zinc-100">
          Ocorreu um erro inesperado
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
          Não se preocupe, os dados do sistema estão preservados. Tente recarregar a operação ou volte à página inicial.
        </p>

        {process.env.NODE_ENV !== 'production' && error.message && (
          <div className="mt-4 max-h-32 w-full overflow-auto rounded bg-slate-100 p-2 text-left font-mono text-xs text-red-600 dark:bg-zinc-950 dark:text-red-400">
            {error.message}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="cursor-pointer inline-flex items-center justify-center rounded-md bg-acao px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-acao-escura"
          >
            Tentar novamente
          </button>
          <Link
            href="/ordens-servico"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Voltar para Ordens de Serviço
          </Link>
        </div>
      </div>
    </div>
  )
}
