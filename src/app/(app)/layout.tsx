import Link from 'next/link'
import { Botao } from '@/componentes/botao'
import { sair } from '@/modulos/auth/acoes'
import { exigirUsuario } from '@/modulos/auth/guarda'
import { Navegacao } from './navegacao'

export default async function LayoutAplicacao({
  children,
}: {
  children: React.ReactNode
}) {
  const usuario = await exigirUsuario()

  return (
    <div className="flex min-h-screen">
      <div className="flex w-60 shrink-0 flex-col justify-between border-r border-borda bg-superficie">
        <div className="flex flex-col gap-6 p-4">
          <Link href="/ordens-servico" className="px-3">
            <span className="block font-semibold tracking-tight">Planeta Motores</span>
            <span className="block text-xs text-tinta-fraca">Motores 2T e 4T</span>
          </Link>

          <Navegacao />
        </div>

        <div className="flex flex-col gap-2 border-t border-borda p-4">
          <Link
            href="/configuracoes"
            className="rounded-md px-3 py-1.5 text-sm text-tinta-suave hover:bg-realce hover:text-tinta"
          >
            Configurações
          </Link>
          <div className="flex items-center justify-between gap-2 px-3 pt-1">
            <span className="truncate text-sm text-tinta-suave">{usuario.nome}</span>
            <form action={sair}>
              <Botao variante="discreto" type="submit">
                Sair
              </Botao>
            </form>
          </div>
        </div>
      </div>

      <main className="min-w-0 flex-1">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
