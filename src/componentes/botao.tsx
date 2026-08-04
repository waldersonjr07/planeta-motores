import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variante = 'primario' | 'secundario' | 'discreto'

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Três pesos, e só. `discreto` é para ação de linha de tabela — remover item,
 * apagar lançamento —, que deve estar disponível sem competir com o resto.
 */
const ESTILOS: Record<Variante, string> = {
  primario: 'bg-acao text-white hover:bg-acao-escura',
  secundario: 'border border-borda-forte bg-superficie hover:bg-realce',
  discreto: 'text-tinta-suave hover:bg-realce hover:text-tinta',
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
