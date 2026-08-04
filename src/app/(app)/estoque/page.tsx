import { formatarQuantidade } from '@/lib/quantidade'
import { listarSaldos } from '@/modulos/estoque/consultas'
import { FormularioAjuste } from './ajuste-formulario'

export default async function PaginaEstoque() {
  const saldos = await listarSaldos()
  const aRepor = saldos.filter((peca) => peca.abaixoDoMinimo)

  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold">Estoque</h1>

      {aRepor.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-900">
            {aRepor.length === 1
              ? '1 peça precisa de reposição'
              : `${aRepor.length} peças precisam de reposição`}
          </p>
          <p className="mt-1 text-amber-900">
            {aRepor
              .map((peca) => `${peca.nome} (${formatarQuantidade(peca.saldo)})`)
              .join(' · ')}
          </p>
        </div>
      )}

      {saldos.length === 0 ? (
        <p className="text-sm text-gray-600">
          Nenhuma peça cadastrada. Cadastre no Catálogo antes de controlar saldo.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-600">
            <tr>
              <th className="py-2">Peça</th>
              <th className="py-2">Unidade</th>
              <th className="py-2 text-right">Saldo</th>
              <th className="py-2 text-right">Mínimo</th>
              <th className="py-2">Controle</th>
            </tr>
          </thead>
          <tbody>
            {saldos.map((peca) => (
              <tr key={peca.id} className="border-b border-gray-100">
                <td className="py-2">
                  {peca.nome}
                  {peca.marca && <span className="text-gray-600"> · {peca.marca}</span>}
                </td>
                <td className="py-2">{peca.unidade}</td>
                <td
                  className={`py-2 text-right ${
                    peca.saldo < 0
                      ? 'font-semibold text-red-600'
                      : peca.abaixoDoMinimo
                        ? 'font-semibold text-amber-600'
                        : ''
                  }`}
                >
                  {formatarQuantidade(peca.saldo)}
                </td>
                <td className="py-2 text-right text-gray-600">
                  {peca.controlaSaldo ? formatarQuantidade(peca.quantidadeMinima) : '—'}
                </td>
                <td className="py-2 text-gray-600">
                  {peca.controlaSaldo ? 'Controla saldo' : 'Compra sob demanda'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">Ajuste de inventário</h2>
        <p className="text-sm text-gray-600">
          O saldo é a soma dos movimentos e nunca é editado direto. Para corrigir, lance um
          ajuste — preencher o motivo é opcional, mas é o que explica o número lá na frente.
        </p>
        <FormularioAjuste
          pecas={saldos.map((peca) => ({
            id: peca.id,
            nome: peca.nome,
            unidade: peca.unidade,
            saldo: peca.saldo,
          }))}
        />
      </div>
    </section>
  )
}
