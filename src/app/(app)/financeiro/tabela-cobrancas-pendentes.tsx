import Link from 'next/link'
import { LinkBotao } from '@/componentes/botao'
import { Celula, Linha, Tabela } from '@/componentes/tabela'
import { formatarReais } from '@/lib/dinheiro'
import type { LinhaDeCobranca } from '@/modulos/financeiro/consultas'

export function TabelaCobrancasPendentes({
  contas,
  totalEmAberto,
}: {
  contas: LinhaDeCobranca[]
  totalEmAberto: number
}) {
  if (contas.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-500 dark:text-zinc-400">
        Nenhuma cobrança pendente. Todas as ordens de serviço executadas ou entregues estão quitadas!
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/5">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Total de dívidas a receber
          </span>
          <p className="font-mono text-xl font-semibold text-red-700 dark:text-red-400">
            {formatarReais(totalEmAberto)}
          </p>
        </div>
        <span className="text-xs text-slate-500 dark:text-zinc-400">
          {contas.length} {contas.length === 1 ? 'ordem de serviço pendente' : 'ordens de serviço pendentes'}
        </span>
      </div>

      <Tabela
        colunas={[
          { texto: 'OS' },
          { texto: 'Cliente' },
          { texto: 'Total OS', numerica: true },
          { texto: 'Já Pago', numerica: true },
          { texto: 'Saldo Devedor', numerica: true },
          { texto: 'Dias em Aberto' },
          { texto: 'Ações', acao: true },
        ]}
      >
        {contas.map((conta) => {
          const dias = conta.diasEmAberto

          return (
            <Linha key={conta.osId}>
              <Celula forte mono>
                <Link
                  href={`/ordens-servico/${conta.osId}?aba=pagamentos`}
                  className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {conta.numero}
                </Link>
              </Celula>

              <Celula>{conta.clienteNome}</Celula>

              <Celula numerica tom="suave" mono>
                {formatarReais(conta.totalCentavos)}
              </Celula>

              <Celula numerica tom="suave" mono>
                {formatarReais(conta.pagoCentavos)}
              </Celula>

              <Celula numerica forte mono>
                <span className="text-red-700 dark:text-red-400">{formatarReais(conta.saldoCentavos)}</span>
              </Celula>

              <Celula>
                {dias === null ? (
                  <span className="text-slate-400 dark:text-zinc-500">—</span>
                ) : dias > 30 ? (
                  <span className="inline-flex items-center rounded-md border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-mono font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                    {dias} dias
                  </span>
                ) : dias > 7 ? (
                  <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-mono font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                    {dias} dias
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300">
                    {dias} dias
                  </span>
                )}
              </Celula>

              <Celula numerica>
                <LinkBotao
                  href={`/ordens-servico/${conta.osId}?aba=pagamentos`}
                  variante="discreto"
                  className="text-xs"
                >
                  Receber
                </LinkBotao>
              </Celula>
            </Linha>
          )
        })}
      </Tabela>
    </div>
  )
}
