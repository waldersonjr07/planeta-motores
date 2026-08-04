import { Botao } from '@/componentes/botao'
import { formatarReais } from '@/lib/dinheiro'
import { formatarQuantidade } from '@/lib/quantidade'
import { acaoDefinirAtivoPeca } from '@/modulos/catalogo/acoes'
import { listarSaldos } from '@/modulos/estoque/consultas'
import { FormularioAjuste } from './ajuste-formulario'
import { FormularioPeca } from './peca-formulario'

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
          Nenhuma peça cadastrada. Use o formulário abaixo para cadastrar a primeira.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-600">
            <tr>
              <th className="py-2">Peça</th>
              <th className="py-2">Unidade</th>
              <th className="py-2 text-right">Preço de venda</th>
              <th className="py-2 text-right">Saldo</th>
              <th className="py-2 text-right">Mínimo</th>
              <th className="py-2">Controle</th>
              <th className="py-2" />
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
                <td className="py-2 text-right">{formatarReais(peca.precoVendaCentavos)}</td>
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

      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">Cadastrar peça</h2>
        <p className="text-sm text-gray-600">
          Marque &ldquo;controla saldo&rdquo; para consumível que fica guardado na oficina.
          Peça específica, comprada só quando o serviço pede, pode ficar sem controle.
        </p>
        <FormularioPeca />
      </div>

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
