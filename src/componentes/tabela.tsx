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
          <tr className="border-b border-borda">
            {colunas.map((coluna, indice) => (
              <th
                key={indice}
                scope="col"
                className={`px-5 pb-2 text-xs font-medium uppercase tracking-wide text-tinta-fraca ${
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
  return <tr className="border-b border-borda last:border-0 hover:bg-realce">{children}</tr>
}

export function Celula({
  children,
  numerica,
  tom,
  forte,
}: {
  children: ReactNode
  numerica?: boolean
  tom?: 'neutro' | 'suave' | 'atencao' | 'alerta' | 'ok'
  forte?: boolean
}) {
  const cor =
    tom === 'suave'
      ? 'text-tinta-suave'
      : tom === 'atencao'
        ? 'text-atencao'
        : tom === 'alerta'
          ? 'text-alerta'
          : tom === 'ok'
            ? 'text-ok'
            : ''

  return (
    <td
      className={`px-5 py-2.5 align-middle ${numerica ? 'text-right' : ''} ${
        forte ? 'font-semibold' : ''
      } ${cor}`}
    >
      {children}
    </td>
  )
}
