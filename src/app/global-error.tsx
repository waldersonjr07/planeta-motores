'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Erro crítico no layout raiz:', error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 font-sans text-center text-slate-900">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold">Erro no sistema</h1>
          <p className="mt-2 text-sm text-slate-600">
            Ocorreu uma falha na renderização da interface. Clique abaixo para reiniciar.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Reiniciar aplicação
          </button>
        </div>
      </body>
    </html>
  )
}
