'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Agrupado pelo que a Lucilene está fazendo, não em lista corrida de oito
 * itens. Estoque fica com a oficina porque é consultado no meio do serviço,
 * não só quando se cadastra peça.
 */
const GRUPOS = [
  {
    titulo: 'Oficina',
    itens: [
      { href: '/ordens-servico', texto: 'Ordens de serviço' },
      { href: '/painel', texto: 'Painel' },
      { href: '/estoque', texto: 'Estoque' },
    ],
  },
  {
    titulo: 'Dinheiro',
    itens: [
      { href: '/financeiro', texto: 'Financeiro' },
      { href: '/compras', texto: 'Compras' },
    ],
  },
  {
    titulo: 'Cadastros',
    itens: [
      { href: '/clientes', texto: 'Clientes' },
      { href: '/catalogo/servicos', texto: 'Catálogo' },
    ],
  },
]

export function Navegacao() {
  const caminho = usePathname()

  return (
    <nav aria-label="Seções do sistema" className="flex flex-col gap-6">
      {GRUPOS.map((grupo) => (
        <div key={grupo.titulo}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            {grupo.titulo}
          </p>
          <ul className="flex flex-col gap-1">
            {grupo.itens.map((item) => {
              // A raiz da seção marca também as telas filhas: estando na ficha
              // de uma OS, "Ordens de serviço" continua aceso; em qualquer aba
              // do catálogo, "Catálogo" continua aceso.
              const raiz = `/${item.href.split('/')[1]}`
              const ativo = caminho === item.href || caminho.startsWith(`${raiz}/`)

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={ativo ? 'page' : undefined}
                    className={`block rounded-r-md border-l-2 px-3 py-2 text-sm transition-colors ${
                      ativo
                        ? 'border-blue-600 bg-blue-50 font-semibold text-blue-700 dark:border-blue-500 dark:bg-blue-600/15 dark:text-blue-400'
                        : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900/80 dark:hover:text-zinc-200'
                    }`}
                  >
                    {item.texto}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
