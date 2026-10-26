import type { ReactNode } from 'react'

export type Coluna = {
  texto: string
  /** Coluna numérica alinha à direita: é o que deixa os valores empilhados. */
  numerica?: boolean
  /** Coluna de ação não tem título visível. */
  acao?: boolean
}

export function Tabela({
  colunas,
  children,
}: {
  colunas: Coluna[]
  children: ReactNode
}) {
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-zinc-800">
            {colunas.map((coluna, indice) => (
              <th
                key={indice}
                scope="col"
                className={`px-5 pb-2.5 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500 ${
                  coluna.numerica ? 'text-right' : 'text-left'
                }`}
              >
                {coluna.acao ? <span className="sr-only">{coluna.texto}</span> : coluna.texto}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Linha({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-slate-200/80 last:border-0 hover:bg-slate-50/80 transition-colors dark:border-zinc-800/70 dark:hover:bg-zinc-800/40">
      {children}
    </tr>
  )
}

export function Celula({
  children,
  numerica,
  mono,
  tom,
  forte,
}: {
  children: ReactNode
  numerica?: boolean
  mono?: boolean
  tom?: 'neutro' | 'suave' | 'atencao' | 'alerta' | 'ok'
  forte?: boolean
}) {
  const cor =
    tom === 'suave'
      ? 'text-slate-500 dark:text-zinc-400'
      : tom === 'atencao'
        ? 'text-amber-700 dark:text-amber-400'
        : tom === 'alerta'
          ? 'text-red-700 dark:text-red-400'
          : tom === 'ok'
            ? 'text-emerald-700 dark:text-emerald-400'
            : forte
              ? 'text-slate-900 dark:text-zinc-100'
              : 'text-slate-800 dark:text-zinc-200'

  const usarMono = numerica || mono

  return (
    <td
      className={`px-5 py-2.5 align-middle ${numerica ? 'text-right' : ''} ${
        usarMono ? 'font-mono' : ''
      } ${forte ? 'font-semibold' : ''} ${cor}`}
    >
      {children}
    </td>
  )
}
