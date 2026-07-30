import { Botao } from '@/componentes/botao'
import { formatarReais } from '@/lib/dinheiro'
import { formatarQuantidade } from '@/lib/quantidade'
import { acaoDefinirAtivoPeca } from '@/modulos/catalogo/acoes'
import { listarPecas } from '@/modulos/catalogo/pecas-consultas'
import { FormularioPeca } from './formulario'

export default async function PaginaPecas() {
  const lista = await listarPecas()

  return (
    <div className="flex flex-col gap-4">
      <FormularioPeca />

      {lista.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhuma peça cadastrada ainda.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-600">
            <tr>
              <th className="py-2">Peça</th>
              <th className="py-2">Unidade</th>
              <th className="py-2">Preço de venda</th>
              <th className="py-2">Estoque</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {lista.map((peca) => (
              <tr key={peca.id} className="border-b border-gray-100">
                <td className="py-2">
                  {peca.nome}
                  {peca.marca && <span className="text-gray-600"> · {peca.marca}</span>}
                </td>
                <td className="py-2">{peca.unidade}</td>
                <td className="py-2">{formatarReais(peca.precoVendaCentavos)}</td>
                <td className="py-2">
                  {peca.controlaSaldo
                    ? `mínimo ${formatarQuantidade(peca.quantidadeMinima)}`
                    : 'compra sob demanda'}
                </td>
                <td className="py-2 text-right">
                  <form action={acaoDefinirAtivoPeca}>
                    <input type="hidden" name="id" value={peca.id} />
                    <input type="hidden" name="ativo" value="false" />
                    <Botao variante="secundario" type="submit">
                      Remover
                    </Botao>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
