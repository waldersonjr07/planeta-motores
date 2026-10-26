import type { ReactNode } from 'react'

export type Tom = 'neutro' | 'andamento' | 'atencao' | 'ok' | 'alerta' | 'encerrado'

const ESTILOS: Record<Tom, string> = {
  neutro: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300',
  andamento: 'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400',
  atencao: 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400',
  ok: 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400',
  alerta: 'border-red-200 bg-red-100 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400',
  encerrado: 'border-slate-200 bg-slate-100 text-slate-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500',
}

/** Marcador de situação. Cor só onde o estado pede atenção. */
export function Etiqueta({ tom = 'neutro', children }: { tom?: Tom; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${ESTILOS[tom]}`}
    >
      {children}
    </span>
  )
}
