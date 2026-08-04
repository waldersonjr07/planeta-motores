import type { ReactNode } from 'react'

export type Tom = 'neutro' | 'andamento' | 'atencao' | 'ok' | 'alerta' | 'encerrado'

const ESTILOS: Record<Tom, string> = {
  neutro: 'border-borda-forte bg-realce text-tinta-suave',
  andamento: 'border-acao/30 bg-acao-fundo text-acao-escura',
  atencao: 'border-atencao-borda bg-atencao-fundo text-atencao',
  ok: 'border-ok/30 bg-ok-fundo text-ok',
  alerta: 'border-alerta/30 bg-alerta-fundo text-alerta',
  encerrado: 'border-borda bg-superficie text-tinta-fraca',
}

/** Marcador de situação. Cor só onde o estado pede atenção. */
export function Etiqueta({ tom = 'neutro', children }: { tom?: Tom; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ESTILOS[tom]}`}
    >
      {children}
    </span>
  )
}
