import Link from 'next/link'
import { Emblema } from '@/componentes/emblema'
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
      {/* O marinho é o campo do emblema: é ele que carrega a marca na tela. */}
      <div className="flex w-60 shrink-0 flex-col justify-between bg-marca text-marca-texto">
        <div className="flex flex-col gap-7 p-4">
          {/* Tamanho e espacejamento ajustados para o nome caber numa linha
              só: quebrado em duas, o letreiro perde a leitura de marca. */}
          <Link href="/ordens-servico" className="flex items-center gap-2.5 px-2 py-1">
            <Emblema tamanho={36} />
            <span className="min-w-0">
              <span className="block whitespace-nowrap text-xs font-semibold uppercase tracking-[0.11em] text-aco">
                Planeta Motores
              </span>
              <span className="mt-0.5 block whitespace-nowrap text-[11px] text-marca-texto/70">
                Atendimento especializado
              </span>
            </span>
          </Link>

          <Navegacao />
        </div>

        <div className="flex flex-col gap-1 border-t border-marca-borda p-4">
          <Link
            href="/configuracoes"
            className="rounded-md px-3 py-1.5 text-sm text-marca-texto hover:bg-marca-clara hover:text-white"
          >
            Configurações
          </Link>
          <div className="flex items-center justify-between gap-2 px-3 pt-1">
            <span className="truncate text-sm text-marca-texto/80">{usuario.nome}</span>
            <form action={sair}>
              <button
                type="submit"
                className="rounded-md px-2 py-1 text-sm text-marca-texto hover:bg-marca-clara hover:text-white"
              >
                Sair
              </button>
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
