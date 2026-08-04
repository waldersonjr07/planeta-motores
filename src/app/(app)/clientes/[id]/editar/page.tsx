import { notFound } from 'next/navigation'
import { CabecalhoPagina, Cartao } from '@/componentes/pagina'
import { Voltar } from '@/componentes/voltar'
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
    <>
      <div className="flex justify-end">
        <Voltar href={`/clientes/${id}`} texto="Voltar para a ficha" />
      </div>

      <CabecalhoPagina titulo={`Editar ${cliente.nome}`} />

      <Cartao>
        <FormularioCliente cliente={cliente} />
      </Cartao>
    </>
  )
}
