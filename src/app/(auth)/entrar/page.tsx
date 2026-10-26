import { redirect } from 'next/navigation'
import { Emblema } from '@/componentes/emblema'
import { usuarioAtual } from '@/modulos/auth/guarda'
import { FormularioLogin } from './formulario'

export default async function PaginaEntrar() {
  if (await usuarioAtual()) redirect('/ordens-servico')

  return (
    // Campo marinho do emblema: é a única tela em que a marca ocupa a página
    // inteira, porque é a única em que não há trabalho competindo com ela.
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <Emblema tamanho={96} />
          <div>
            <h1 className="text-base font-semibold uppercase tracking-[0.15em] text-zinc-100">
              Planeta Motores
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Sistema de Gestão e Oficina
            </p>
          </div>
        </div>

        <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-8 shadow-none">
          <FormularioLogin />
        </div>
      </div>
    </main>
  )
}
