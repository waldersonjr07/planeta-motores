import { redirect } from 'next/navigation'
import { usuarioAtual } from '@/modulos/auth/guarda'
import { FormularioLogin } from './formulario'

export default async function PaginaEntrar() {
  if (await usuarioAtual()) redirect('/clientes')

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <FormularioLogin />
    </main>
  )
}
