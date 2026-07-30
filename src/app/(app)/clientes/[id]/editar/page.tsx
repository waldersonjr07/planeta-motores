import { notFound } from 'next/navigation'
import { obterCliente } from '@/modulos/clientes/consultas'
import { FormularioCliente } from '../../formulario'

export default async function PaginaEditarCliente({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cliente = await obterCliente(id)
  if (!cliente) notFound()

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Editar {cliente.nome}</h1>
      <FormularioCliente cliente={cliente} />
    </section>
  )
}
