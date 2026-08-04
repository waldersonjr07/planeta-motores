import Link from 'next/link'

// Peças não ficam aqui: são cadastradas e acompanhadas na tela de Estoque, que
// é onde saldo, mínimo e movimentação fazem sentido juntos.
const ABAS = [
  { href: '/catalogo/servicos', texto: 'Serviços' },
  { href: '/catalogo/fornecedores', texto: 'Fornecedores' },
]

export default function LayoutCatalogo({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Catálogo</h1>
      <nav className="flex gap-4 border-b border-gray-200 pb-2 text-sm">
        {ABAS.map((aba) => (
          <Link key={aba.href} href={aba.href} className="text-blue-700 hover:underline">
            {aba.texto}
          </Link>
        ))}
      </nav>
      {children}
    </section>
  )
}
