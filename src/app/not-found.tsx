import Link from 'next/link'
import { Emblema } from '@/componentes/emblema'

export default function NaoEncontrado() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-zinc-950 transition-colors">
      <div className="flex flex-col items-center max-w-md p-8 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <Emblema tamanho={56} />
        <span className="mt-4 font-mono text-4xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
          404
        </span>
        <h1 className="mt-2 text-lg font-semibold text-slate-900 dark:text-zinc-100">
          Página não encontrada
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
          O endereço solicitado não existe ou pode ter sido movido. Verifique o link e tente novamente.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Link
            href="/ordens-servico"
            className="inline-flex items-center justify-center rounded-md bg-acao px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-acao-escura"
          >
            Ir para Ordens de Serviço
          </Link>
          <Link
            href="/painel"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Painel Geral
          </Link>
        </div>
      </div>
    </div>
  )
}
