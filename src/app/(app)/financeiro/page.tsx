import Link from 'next/link'
import { Botao } from '@/componentes/botao'
import { formatarReais } from '@/lib/dinheiro'
import { hoje, mesDe, rotuloDoMes } from '@/lib/periodo'
import { acaoRemoverDespesa } from '@/modulos/financeiro/acoes'
import {
  listarContasAReceber,
  listarDespesas,
  resultadoDoPeriodo,
} from '@/modulos/financeiro/consultas'
import { CATEGORIAS_DESPESA } from '@/modulos/financeiro/esquemas'
import { FormularioDespesa } from './despesa-formulario'

export default async function PaginaFinanceiro({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { mes: mesPedido } = await searchParams
  const periodo = mesDe(mesPedido ? `${mesPedido}-01` : undefined)

  const [aReceber, despesas, resultado] = await Promise.all([
    listarContasAReceber(),
    listarDespesas(periodo),
    resultadoDoPeriodo(periodo.de, periodo.ate),
  ])

  const totalAReceber = aReceber.reduce((soma, conta) => soma + conta.saldoCentavos, 0)

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Financeiro</h1>

      <div>
        <h2 className="font-semibold">Contas a receber</h2>
        <p className="mt-1 text-sm text-gray-600">
          Da mais antiga para a mais recente. Total em aberto:{' '}
          <strong>{formatarReais(totalAReceber)}</strong>
        </p>

        {aReceber.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">Ninguém devendo.</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead className="border-b border-gray-200 text-left text-gray-600">
              <tr>
                <th className="py-2">OS</th>
                <th className="py-2">Cliente</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2 text-right">Pago</th>
                <th className="py-2 text-right">Saldo</th>
                <th className="py-2 text-right">Dias</th>
              </tr>
            </thead>
            <tbody>
              {aReceber.map((conta) => (
                <tr key={conta.osId} className="border-b border-gray-100">
                  <td className="py-2">
                    <Link
                      href={`/ordens-servico/${conta.osId}?aba=pagamentos`}
                      className="text-blue-700 hover:underline"
                    >
                      {conta.numero}
                    </Link>
                  </td>
                  <td className="py-2">{conta.clienteNome}</td>
                  <td className="py-2 text-right">{formatarReais(conta.totalCentavos)}</td>
                  <td className="py-2 text-right">{formatarReais(conta.pagoCentavos)}</td>
                  <td className="py-2 text-right font-semibold text-red-600">
                    {formatarReais(conta.saldoCentavos)}
                  </td>
                  <td className="py-2 text-right">{conta.diasEmAberto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <h2 className="font-semibold">Resultado de {rotuloDoMes(periodo)}</h2>
        <p className="mt-1 text-sm text-gray-600">
          Regime de caixa: entrou o que foi pago no período, saiu o que foi comprado e gasto.
        </p>
        <dl className="mt-2 w-80 text-sm" role="group" aria-label="Resultado do período">
          <div className="flex justify-between py-0.5">
            <dt className="text-gray-600">Entradas (pagamentos)</dt>
            <dd>{formatarReais(resultado.entradasCentavos)}</dd>
          </div>
          <div className="flex justify-between py-0.5">
            <dt className="text-gray-600">Compras de peça</dt>
            <dd>-{formatarReais(resultado.comprasCentavos)}</dd>
          </div>
          <div className="flex justify-between py-0.5">
            <dt className="text-gray-600">Outras despesas</dt>
            <dd>-{formatarReais(resultado.despesasCentavos)}</dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-gray-200 pt-1 font-semibold">
            <dt>Resultado</dt>
            <dd className={resultado.resultadoCentavos < 0 ? 'text-red-600' : 'text-green-700'}>
              {formatarReais(resultado.resultadoCentavos)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold">Despesas de {rotuloDoMes(periodo)}</h2>
        <FormularioDespesa hoje={hoje()} />

        {despesas.length === 0 ? (
          <p className="text-sm text-gray-600">Nenhuma despesa lançada no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 text-left text-gray-600">
              <tr>
                <th className="py-2">Data</th>
                <th className="py-2">Categoria</th>
                <th className="py-2">Descrição</th>
                <th className="py-2 text-right">Valor</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {despesas.map((despesa) => (
                <tr key={despesa.id} className="border-b border-gray-100">
                  <td className="py-2">{despesa.data.split('-').reverse().join('/')}</td>
                  <td className="py-2">{CATEGORIAS_DESPESA[despesa.categoria]}</td>
                  <td className="py-2">{despesa.descricao}</td>
                  <td className="py-2 text-right">{formatarReais(despesa.valorCentavos)}</td>
                  <td className="py-2 text-right">
                    <form action={acaoRemoverDespesa}>
                      <input type="hidden" name="despesaId" value={despesa.id} />
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
    </section>
  )
}
