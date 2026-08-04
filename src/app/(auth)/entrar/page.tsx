import { redirect } from 'next/navigation'
import { Emblema } from '@/componentes/emblema'
import { usuarioAtual } from '@/modulos/auth/guarda'
import { FormularioLogin } from './formulario'

export default async function PaginaEntrar() {
  if (await usuarioAtual()) redirect('/ordens-servico')

  return (
    // Campo marinho do emblema: é a única tela em que a marca ocupa a página
    // inteira, porque é a única em que não há trabalho competindo com ela.
    <main className="flex min-h-screen items-center justify-center bg-marca p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-4 text-center">
          <Emblema tamanho={112} />
          <div>
            <h1 className="text-lg font-semibold uppercase tracking-[0.15em] text-aco">
              Planeta Motores
            </h1>
            <p className="mt-1 text-sm text-marca-texto">
              Atendimento especializado desde 2015
            </p>
          </div>
        </div>

        <div className="w-full rounded-lg bg-superficie px-8 py-8">
          <FormularioLogin />
        </div>
      </div>
    </main>
  )
}
