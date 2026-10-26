import type { ReactNode } from 'react'

/** Faixa de topo da página: o que é esta tela e a ação principal dela. */
export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string
  descricao?: string
  acoes?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">{titulo}</h1>
        {descricao && (
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-zinc-400">{descricao}</p>
        )}
      </div>
      {acoes && <div className="flex items-center gap-2">{acoes}</div>}
    </header>
  )
}

/**
 * Bloco de conteúdo com nome próprio. Vira `role="region"` acessível,
 * com suporte ao Light Mode (bg-white border-slate-200 shadow-sm) e Dark Mode (dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none).
 */
export function Secao({
  titulo,
  descricao,
  acoes,
  children,
}: {
  titulo: string
  descricao?: string
  acoes?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      aria-label={titulo}
      className="rounded-lg border border-slate-200 bg-white shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-zinc-100">{titulo}</h2>
          {descricao && (
            <p className="mt-0.5 max-w-2xl text-sm text-slate-600 dark:text-zinc-400">{descricao}</p>
          )}
        </div>
        {acoes && <div className="flex items-center gap-2">{acoes}</div>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

/**
 * Cartão sem título próprio, para o conteúdo principal de uma tela que já se
 * apresenta no `h1`.
 */
export function Cartao({
  children,
  barra,
}: {
  children: ReactNode
  barra?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
      {barra && <div className="border-b border-slate-200 px-5 py-3 dark:border-zinc-800">{barra}</div>}
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

/** Texto de tela vazia: diz o que fazer, não só que não há nada. */
export function Vazio({ children }: { children: ReactNode }) {
  return <p className="py-2 text-sm text-slate-500 dark:text-zinc-400">{children}</p>
}

/** Rótulo pequeno de dado, para pares rótulo/valor fora de formulário. */
export function Dado({
  rotulo,
  children,
  tom,
  mono,
}: {
  rotulo: string
  children: ReactNode
  tom?: 'neutro' | 'alerta' | 'ok'
  mono?: boolean
}) {
  const cor =
    tom === 'alerta'
      ? 'text-red-600 dark:text-red-400'
      : tom === 'ok'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-slate-900 dark:text-zinc-100'

  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-zinc-400">{rotulo}</dt>
      <dd className={`mt-0.5 font-semibold ${mono ? 'font-mono' : ''} ${cor}`}>{children}</dd>
    </div>
  )
}
