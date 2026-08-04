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
          <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-marca-texto/75">
            {grupo.titulo}
          </p>
          <ul className="flex flex-col gap-0.5">
            {grupo.itens.map((item) => {
              // A raiz da seção marca também as telas filhas: estando na ficha
              // de uma OS, "Ordens de serviço" continua aceso; em qualquer aba
              // do catálogo, "Catálogo" continua aceso.
              const raiz = `/${item.href.split('/')[1]}`
              const ativo = caminho === item.href || caminho.startsWith(`${raiz}/`)

              return (
                <li key={item.href}>
                  {/*
                    O teal é a única cor cromática do menu, e existe para dizer
                    onde você está. Vem dos continentes do planeta no emblema.
                  */}
                  <Link
                    href={item.href}
                    aria-current={ativo ? 'page' : undefined}
                    className={`block rounded-md border-l-2 px-3 py-1.5 text-sm transition-colors ${
                      ativo
                        ? 'border-planeta bg-marca-clara font-medium text-planeta'
                        : 'border-transparent text-marca-texto hover:bg-marca-clara/60 hover:text-white'
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
