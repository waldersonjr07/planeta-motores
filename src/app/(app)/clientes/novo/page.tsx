import { CabecalhoPagina, Cartao } from '@/componentes/pagina'
import { Voltar } from '@/componentes/voltar'
import { FormularioCliente } from '../formulario'

export default function PaginaNovoCliente() {
  return (
    <>
      <div className="flex justify-end">
        <Voltar href="/clientes" texto="Voltar para clientes" />
      </div>

      <CabecalhoPagina
        titulo="Novo cliente"
        descricao="Só o nome é obrigatório. Os equipamentos são cadastrados na ficha, depois de salvar."
      />

      <Cartao>
        <FormularioCliente />
      </Cartao>
    </>
  )
}
