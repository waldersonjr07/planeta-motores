import Link from 'next/link'
import { BotaoTema } from '@/componentes/botao-tema'
import { Emblema } from '@/componentes/emblema'
import { sair } from '@/modulos/auth/acoes'
import { exigirUsuario } from '@/modulos/auth/guarda'
import { AvisoDeBackup } from '@/modulos/backup/componentes'
import { obterEstadoDoBackup } from '@/modulos/backup/consultas'
import { precisaAvisar } from '@/modulos/backup/estado'
import '../globals.css'
import { Navegacao } from './navegacao'

export default async function LayoutAplicacao({
  children,
}: {
  children: React.ReactNode
}) {
  const [usuario, backup] = await Promise.all([exigirUsuario(), obterEstadoDoBackup()])

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">
      {/* Barra lateral corporativa com suporte a modo diurno e noturno */}
      <aside className="flex w-60 shrink-0 flex-col justify-between border-r border-slate-200 bg-white text-slate-600 transition-colors dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        <div className="flex flex-col gap-6 p-4">
          <Link
            href="/ordens-servico"
            className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-zinc-900/60"
          >
            <Emblema tamanho={34} />
            <span className="min-w-0">
              <span className="block whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-slate-900 dark:text-zinc-100">
                Planeta Motores
              </span>
              <span className="mt-0.5 block whitespace-nowrap text-[11px] text-slate-500 dark:text-zinc-400">
                Oficina e Diagnóstico
              </span>
            </span>
          </Link>

          <Navegacao />
        </div>

        <div className="flex flex-col gap-1.5 border-t border-slate-200 p-4 dark:border-zinc-800/80">
          <BotaoTema />

          <Link
            href="/configuracoes"
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            Configurações
          </Link>
          <div className="flex items-center justify-between gap-2 px-3 pt-1">
            <span className="truncate text-sm text-slate-500 dark:text-zinc-400">{usuario.nome}</span>
            <form action={sair}>
              <button
                type="submit"
                className="cursor-pointer rounded-md px-2 py-1 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-8 py-8">
          {backup && precisaAvisar(backup) && <AvisoDeBackup estado={backup} />}
          {children}
        </div>
      </main>
    </div>
  )
}
