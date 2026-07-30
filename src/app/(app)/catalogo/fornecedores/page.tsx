import { Botao } from '@/componentes/botao'
import { acaoDefinirAtivoFornecedor } from '@/modulos/catalogo/acoes'
import { listarFornecedores } from '@/modulos/catalogo/fornecedores-consultas'
import { FormularioFornecedor } from './formulario'

export default async function PaginaFornecedores() {
  const lista = await listarFornecedores()

  return (
    <div className="flex flex-col gap-4">
      <FormularioFornecedor />

      {lista.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhum fornecedor cadastrado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {lista.map((fornecedor) => (
            <li
              key={fornecedor.id}
              className="flex items-center justify-between rounded border border-gray-200 px-3 py-2"
            >
              <span>
                {fornecedor.nome}
                {fornecedor.telefone && (
                  <span className="text-gray-600"> · {fornecedor.telefone}</span>
                )}
              </span>
              <form action={acaoDefinirAtivoFornecedor}>
                <input type="hidden" name="id" value={fornecedor.id} />
                <input type="hidden" name="ativo" value="false" />
                <Botao variante="secundario" type="submit">
                  Remover
                </Botao>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
