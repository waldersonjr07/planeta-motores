import { listarEquipamentosParaSelecao } from '@/modulos/clientes/equipamentos-consultas'
import { FormularioNovaOs } from './formulario'

export default async function PaginaNovaOs() {
  const equipamentos = await listarEquipamentosParaSelecao()

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Nova ordem de serviço</h1>
      <FormularioNovaOs equipamentos={equipamentos} />
    </section>
  )
}
