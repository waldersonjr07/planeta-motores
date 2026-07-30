import { FormularioCliente } from '../formulario'

export default function PaginaNovoCliente() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Novo cliente</h1>
      <FormularioCliente />
    </section>
  )
}
