import Link from 'next/link'
import { CabecalhoPagina } from '@/componentes/pagina'

// Peças não ficam aqui: são cadastradas e acompanhadas na tela de Estoque, que
// é onde saldo, mínimo e movimentação fazem sentido juntos.
const ABAS = [
  { href: '/catalogo/servicos', texto: 'Serviços' },
  { href: '/catalogo/fornecedores', texto: 'Fornecedores' },
]

export default function LayoutCatalogo({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CabecalhoPagina
        titulo="Catálogo"
        descricao="Serviços com preço padrão e fornecedores. O preço do catálogo é sugestão: no orçamento dá para ajustar ou digitar um item fora da tabela."
      />

      <nav aria-label="Seções do catálogo" className="flex gap-1">
        {ABAS.map((aba) => (
          <Link
            key={aba.href}
            href={aba.href}
            className="rounded-md px-3 py-1.5 text-sm text-tinta-suave hover:bg-realce hover:text-tinta"
          >
            {aba.texto}
          </Link>
        ))}
      </nav>

      {children}
    </>
  )
}
