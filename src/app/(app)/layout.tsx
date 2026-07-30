import Link from 'next/link'
import { Botao } from '@/componentes/botao'
import { sair } from '@/modulos/auth/acoes'
import { exigirUsuario } from '@/modulos/auth/guarda'

// Somente rotas que existem. Painel e Financeiro entram no Plano 3.
const MENU = [
  { href: '/ordens-servico', texto: 'Ordens de serviço' },
  { href: '/clientes', texto: 'Clientes' },
  { href: '/estoque', texto: 'Estoque' },
  { href: '/compras', texto: 'Compras' },
  { href: '/catalogo/servicos', texto: 'Catálogo' },
  { href: '/configuracoes', texto: 'Configurações' },
]

export default async function LayoutAplicacao({
  children,
}: {
  children: React.ReactNode
}) {
  const usuario = await exigirUsuario()

  return (
    <div className="flex min-h-screen">
      <nav className="flex w-56 flex-col justify-between border-r border-gray-200 bg-gray-50 p-4">
        <div>
          <p className="mb-6 font-semibold">Planeta Motores</p>
          <ul className="flex flex-col gap-1">
            {MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded px-2 py-1.5 text-sm hover:bg-gray-200"
                >
                  {item.texto}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <form action={sair} className="flex flex-col gap-2">
          <span className="text-xs text-gray-600">{usuario.nome}</span>
          <Botao variante="secundario" type="submit">
            Sair
          </Botao>
        </form>
      </nav>

      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
