import Link from 'next/link'
import { mesAnterior, mesAtualIso, mesSeguinte, type Periodo, rotuloDoMes } from '@/lib/periodo'

export function NavegacaoMes({
  periodo,
  mesReferencia,
  aba = 'fluxo',
}: {
  periodo: Periodo
  mesReferencia: string
  aba?: string
}) {
  const anterior = mesAnterior(mesReferencia)
  const seguinte = mesSeguinte(mesReferencia)
  const atual = mesAtualIso()
  const ehMesAtual = mesReferencia === atual

  // Capitaliza a primeira letra do rótulo do mês ("outubro de 2026" -> "Outubro de 2026")
  const rotulo = rotuloDoMes(periodo)
  const rotuloFormatado = rotulo.charAt(0).toUpperCase() + rotulo.slice(1)

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900/60 dark:shadow-none">
      <div className="flex items-center gap-2">
        <Link
          href={`/financeiro?mes=${anterior}&aba=${aba}`}
          aria-label="Mês anterior"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          ‹
        </Link>

        <span className="min-w-44 text-center text-sm font-medium text-slate-900 dark:text-zinc-100">
          {rotuloFormatado}
        </span>

        <Link
          href={`/financeiro?mes=${seguinte}&aba=${aba}`}
          aria-label="Próximo mês"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          ›
        </Link>
      </div>

      {!ehMesAtual && (
        <Link
          href={`/financeiro?mes=${atual}&aba=${aba}`}
          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-blue-600 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-blue-400 dark:hover:border-blue-500/50 dark:hover:bg-blue-600/10"
        >
          Ir para o mês atual
        </Link>
      )}
    </div>
  )
}
