import { CabecalhoPagina, Cartao } from '@/componentes/pagina'
import { Voltar } from '@/componentes/voltar'
import { listarEquipamentosParaSelecao } from '@/modulos/clientes/equipamentos-consultas'
import { FormularioNovaOs } from './formulario'

export default async function PaginaNovaOs() {
  const equipamentos = await listarEquipamentosParaSelecao()

  return (
    <>
      <div className="flex justify-end">
        <Voltar href="/ordens-servico" texto="Voltar para ordens de serviço" />
      </div>

      <CabecalhoPagina
        titulo="Nova ordem de serviço"
        descricao="Escolha um cliente já cadastrado ou digite os dados na hora. O orçamento é montado depois, na ficha da OS, com o diagnóstico do Ivan."
      />

      <Cartao>
        <FormularioNovaOs equipamentos={equipamentos} />
      </Cartao>
    </>
  )
}
