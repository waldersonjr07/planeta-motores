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
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descricao && (
          <p className="mt-1 max-w-2xl text-sm text-tinta-suave">{descricao}</p>
        )}
      </div>
      {acoes && <div className="flex items-center gap-2">{acoes}</div>}
    </header>
  )
}

/**
 * Bloco de conteúdo com nome próprio. Vira `role="region"` acessível, o que
 * separa de verdade as três coisas que antes se empilhavam parecendo uma só.
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
      className="rounded-lg border border-borda bg-superficie"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-borda px-5 py-4">
        <div>
          <h2 className="font-semibold">{titulo}</h2>
          {descricao && (
            <p className="mt-0.5 max-w-2xl text-sm text-tinta-suave">{descricao}</p>
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
 * apresenta no `h1`. Repetir o título ali criaria dois cabeçalhos com o mesmo
 * nome na mesma página.
 */
export function Cartao({
  children,
  barra,
}: {
  children: ReactNode
  barra?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-borda bg-superficie">
      {barra && <div className="border-b border-borda px-5 py-3">{barra}</div>}
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

/** Texto de tela vazia: diz o que fazer, não só que não há nada. */
export function Vazio({ children }: { children: ReactNode }) {
  return <p className="py-2 text-sm text-tinta-suave">{children}</p>
}

/** Rótulo pequeno de dado, para pares rótulo/valor fora de formulário. */
export function Dado({
  rotulo,
  children,
  tom,
}: {
  rotulo: string
  children: ReactNode
  tom?: 'neutro' | 'alerta' | 'ok'
}) {
  const cor =
    tom === 'alerta' ? 'text-alerta' : tom === 'ok' ? 'text-ok' : 'text-tinta'

  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-tinta-fraca">{rotulo}</dt>
      <dd className={`mt-0.5 font-semibold ${cor}`}>{children}</dd>
    </div>
  )
}
