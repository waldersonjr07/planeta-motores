import { Botao } from '@/componentes/botao'
import { formatarReais } from '@/lib/dinheiro'
import { acaoDefinirAtivoServico } from '@/modulos/catalogo/acoes'
import { listarServicos } from '@/modulos/catalogo/servicos-consultas'
import { FormularioServico } from './formulario'

export default async function PaginaServicos() {
  const lista = await listarServicos()

  return (
    <div className="flex flex-col gap-4">
      <FormularioServico />

      {lista.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhum serviço cadastrado ainda.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-600">
            <tr>
              <th className="py-2">Serviço</th>
              <th className="py-2">Preço padrão</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {lista.map((servico) => (
              <tr key={servico.id} className="border-b border-gray-100">
                <td className="py-2">{servico.nome}</td>
                <td className="py-2">{formatarReais(servico.precoPadraoCentavos)}</td>
                <td className="py-2 text-right">
                  <form action={acaoDefinirAtivoServico}>
                    <input type="hidden" name="id" value={servico.id} />
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
