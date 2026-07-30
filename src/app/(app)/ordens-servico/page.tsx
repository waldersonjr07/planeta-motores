import Link from 'next/link'
import { formatarData } from '@/lib/datas'
import { formatarReais } from '@/lib/dinheiro'
import { listarOs } from '@/modulos/os/consultas'
import { SITUACOES, type SituacaoOs } from '@/modulos/os/situacoes'
import { FiltrosOs } from './filtros'

/** "Na oficina" é o que já entrou e ainda não saiu — o dia a dia da Lucilene. */
const NA_OFICINA: SituacaoOs[] = [
  'recebido',
  'em_diagnostico',
  'orcamento_enviado',
  'aprovado',
  'aguardando_peca',
  'em_execucao',
  'pronto',
]

const COR_DA_SITUACAO: Partial<Record<SituacaoOs, string>> = {
  orcamento_enviado: 'text-amber-600',
  aguardando_peca: 'text-red-600',
  pronto: 'text-green-700',
  entregue: 'text-gray-500',
  devolvido: 'text-gray-500',
  cancelado: 'text-gray-500',
}

export default async function PaginaOrdensServico({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; situacao?: string }>
}) {
  const { busca, situacao } = await searchParams

  const situacoes =
    situacao === 'na_oficina'
      ? NA_OFICINA
      : situacao && situacao in SITUACOES
        ? [situacao as SituacaoOs]
        : undefined

  const lista = await listarOs({ busca, situacoes })

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Ordens de serviço</h1>
        <Link
          href="/ordens-servico/nova"
          className="rounded bg-blue-600 px-3 py-2 text-sm text-white"
        >
          Nova OS
        </Link>
      </header>

      <FiltrosOs />

      {lista.length === 0 ? (
        <p className="text-sm text-gray-600">
          {busca || situacao
            ? 'Nenhuma ordem de serviço encontrada com esses filtros.'
            : 'Nenhuma ordem de serviço aberta ainda.'}
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-600">
            <tr>
              <th className="py-2">OS</th>
              <th className="py-2">Cliente</th>
              <th className="py-2">Equipamento</th>
              <th className="py-2">Situação</th>
              <th className="py-2">Recebido</th>
              <th className="py-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((os) => (
              <tr key={os.id} className="border-b border-gray-100">
                <td className="py-2">
                  <Link
                    href={`/ordens-servico/${os.id}`}
                    className="text-blue-700 hover:underline"
                  >
                    {os.numero}
                  </Link>
                </td>
                <td className="py-2">{os.clienteNome}</td>
                <td className="py-2">{os.equipamentoDescricao}</td>
                <td className={`py-2 ${COR_DA_SITUACAO[os.situacao] ?? ''}`}>
                  {SITUACOES[os.situacao]}
                </td>
                <td className="py-2">{formatarData(os.recebidoEm)}</td>
                <td className="py-2 text-right">
                  {os.totalCentavos > 0 ? formatarReais(os.totalCentavos) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
