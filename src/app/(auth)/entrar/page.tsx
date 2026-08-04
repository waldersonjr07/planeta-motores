import { redirect } from 'next/navigation'
import { usuarioAtual } from '@/modulos/auth/guarda'
import { FormularioLogin } from './formulario'

export default async function PaginaEntrar() {
  if (await usuarioAtual()) redirect('/ordens-servico')

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border border-borda bg-superficie px-8 py-10">
        <FormularioLogin />
      </div>
    </main>
  )
}
