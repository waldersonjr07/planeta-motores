'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { formatarReais } from '@/lib/dinheiro'
import { acaoRegistrarPagamento, acaoRemoverPagamento } from '@/modulos/financeiro/acoes'
import { CONDICOES, type CondicaoCobranca } from '@/modulos/financeiro/cobranca'
import { FORMAS_PAGAMENTO } from '@/modulos/financeiro/esquemas'

type Pagamento = {
  id: string
  valorCentavos: number
  forma: keyof typeof FORMAS_PAGAMENTO
  data: string
  observacao: string | null
}

export function AbaPagamentos({
  osId,
  pagamentos,
  resumo,
  hoje,
}: {
  osId: string
  pagamentos: Pagamento[]
  resumo: {
    totalCentavos: number
    pagoCentavos: number
    saldoCentavos: number
    condicao: CondicaoCobranca
  }
  hoje: string
}) {
  const [resultado, enviar, pendente] = useActionState(acaoRegistrarPagamento, null)

  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-wrap gap-6 text-sm">
        <div>
          <dt className="text-gray-600">Total</dt>
          <dd className="font-semibold">{formatarReais(resumo.totalCentavos)}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Pago</dt>
          <dd className="font-semibold">{formatarReais(resumo.pagoCentavos)}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Saldo devedor</dt>
          <dd
            className={`font-semibold ${resumo.saldoCentavos > 0 ? 'text-red-600' : 'text-green-700'}`}
          >
            {formatarReais(resumo.saldoCentavos)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-600">Cobrança</dt>
          <dd className="font-semibold">{CONDICOES[resumo.condicao]}</dd>
        </div>
      </dl>

      {pagamentos.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhum pagamento lançado.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-600">
            <tr>
              <th className="py-2">Data</th>
              <th className="py-2">Forma</th>
              <th className="py-2">Observação</th>
              <th className="py-2 text-right">Valor</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {pagamentos.map((pagamento) => (
              <tr key={pagamento.id} className="border-b border-gray-100">
                <td className="py-2">{pagamento.data.split('-').reverse().join('/')}</td>
                <td className="py-2">{FORMAS_PAGAMENTO[pagamento.forma]}</td>
                <td className="py-2 text-gray-600">{pagamento.observacao ?? '—'}</td>
                <td className="py-2 text-right">{formatarReais(pagamento.valorCentavos)}</td>
                <td className="py-2 text-right">
                  <form action={acaoRemoverPagamento}>
                    <input type="hidden" name="pagamentoId" value={pagamento.id} />
                    <input type="hidden" name="osId" value={osId} />
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

      {resumo.saldoCentavos > 0 && (
        <form
          action={enviar}
          className="flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4"
        >
          <input type="hidden" name="osId" value={osId} />

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700">Valor</span>
            <input
              name="valor"
              required
              placeholder="0,00"
              className="w-32 rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700">Forma</span>
            <select
              name="forma"
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            >
              {Object.entries(FORMAS_PAGAMENTO).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700">Data</span>
            <input
              type="date"
              name="data"
              defaultValue={hoje}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700">Observação</span>
            <input
              name="observacao"
              placeholder="Sinal, saldo…"
              className="w-56 rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <Botao type="submit" disabled={pendente}>
            {pendente ? 'Lançando…' : 'Lançar pagamento'}
          </Botao>

          {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
        </form>
      )}
    </div>
  )
}
