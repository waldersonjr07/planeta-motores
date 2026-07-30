import { obterConfiguracoes } from '@/modulos/configuracoes/consultas'
import { FormularioConfiguracoes } from './formulario'

export default async function PaginaConfiguracoes() {
  const valores = await obterConfiguracoes()

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Configurações</h1>
      <FormularioConfiguracoes valores={valores} />
    </section>
  )
}
