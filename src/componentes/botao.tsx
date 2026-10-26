import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variante = 'primario' | 'secundario' | 'discreto'

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Três pesos elegantes e corporativos. Sem sombras pesadas, com foco em legibilidade e contraste.
 */
const ESTILOS: Record<Variante, string> = {
  primario: 'bg-acao text-white hover:bg-acao-escura active:bg-blue-800 shadow-none',
  secundario:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:border-zinc-600 dark:hover:text-white dark:shadow-none',
  discreto:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-none dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }

export function Botao({ variante = 'primario', className = '', ...props }: Props) {
  return <button {...props} className={`${BASE} ${ESTILOS[variante]} ${className}`} />
}

/** Link com aparência de botão, para navegação que abre uma tela. */
export function LinkBotao({
  href,
  variante = 'secundario',
  className = '',
  children,
  ...props
}: {
  href: string
  variante?: Variante
  className?: string
  children: ReactNode
  target?: string
  rel?: string
}) {
  return (
    <Link href={href} className={`${BASE} ${ESTILOS[variante]} ${className}`} {...props}>
      {children}
    </Link>
  )
}
