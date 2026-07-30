import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario'
}

const ESTILOS = {
  primario: 'bg-blue-600 text-white hover:bg-blue-700',
  secundario: 'border border-gray-300 text-gray-800 hover:bg-gray-50',
} as const

export function Botao({ variante = 'primario', className = '', ...props }: Props) {
  return (
    <button
      {...props}
      className={`rounded px-3 py-2 text-sm disabled:opacity-60 ${ESTILOS[variante]} ${className}`}
    />
  )
}
