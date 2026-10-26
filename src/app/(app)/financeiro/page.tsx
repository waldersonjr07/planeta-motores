import Link from 'next/link'
import { CabecalhoPagina, Secao } from '@/componentes/pagina'
import { formatarReais } from '@/lib/dinheiro'
import { hoje, mesDe, rotuloDoMes } from '@/lib/periodo'
import {
  listarCobrancas,
  listarFluxoDeCaixa,
  resultadoDoPeriodo,
  somarSaldo,
} from '@/modulos/financeiro/consultas'
import { ModalNovaDespesa } from './modal-despesa'
import { NavegacaoMes } from './navegacao-mes'
import { TabelaCobrancasPendentes } from './tabela-cobrancas-pendentes'
import { TabelaFluxoCaixa } from './tabela-fluxo-caixa'

export default async function PaginaFinanceiro({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; aba?: string }>
}) {
  const { mes: mesPedido, aba: abaPedida } = await searchParams
  const mesAtivo = mesPedido || hoje().slice(0, 7)
  const periodo = mesDe(`${mesAtivo}-01`)
  const aba = abaPedida === 'cobrancas' ? 'cobrancas' : 'fluxo'

  const [cobrancas, resultado, movimentacoes] = await Promise.all([
    listarCobrancas(),
    resultadoDoPeriodo(periodo.de, periodo.ate),
    listarFluxoDeCaixa(periodo),
  ])

  // Total das dívidas reais a receber (apenas ordens prontas ou entregues com saldo em aberto)
  const totalAReceber = somarSaldo(cobrancas.aguardandoPagamento)

  return (
    <>
      <CabecalhoPagina
        titulo="Financeiro"
        descricao="Fluxo de caixa em regime financeiro real e controle de cobranças da oficina."
        acoes={<ModalNovaDespesa hoje={hoje()} />}
      />

      {/* Controles de Navegação de Mês */}
      <NavegacaoMes periodo={periodo} mesReferencia={mesAtivo} aba={aba} />

      {/* Top-Level KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: Entradas */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Entradas
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
              Recebimentos
            </span>
          </div>
          <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">
            {formatarReais(resultado.entradasCentavos)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
            Pagamentos de serviços recebidos no mês
          </p>
        </div>

        {/* Card 2: Saídas */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Saídas
            </span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800 dark:bg-red-500/10 dark:text-red-400">
              Despesas & Compras
            </span>
          </div>
          <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-red-700 dark:text-red-400">
            {formatarReais(resultado.saidasCentavos)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
            Compras de peças ({formatarReais(resultado.comprasCentavos)}) + despesas ({formatarReais(resultado.despesasCentavos)})
          </p>
        </div>

        {/* Card 3: Resultado Líquido */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Resultado Líquido
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                resultado.resultadoCentavos >= 0
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
              }`}
            >
              {resultado.resultadoCentavos >= 0 ? 'Superávit' : 'Déficit'}
            </span>
          </div>
          <p
            className={`mt-3 font-mono text-3xl font-semibold tracking-tight ${
              resultado.resultadoCentavos >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-red-700 dark:text-red-400'
            }`}
          >
            {formatarReais(resultado.resultadoCentavos)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
            Saldo real do período (Entradas - Saídas)
          </p>
        </div>
      </div>

      {/* Separação de Abas do Financeiro */}
      <nav aria-label="Seções do financeiro" className="flex items-center gap-2 border-b border-slate-200 pb-1 dark:border-zinc-800">
        <Link
          href={`/financeiro?mes=${mesAtivo}&aba=fluxo`}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            aba === 'fluxo'
              ? 'border-b-2 border-blue-600 bg-blue-50 font-semibold text-blue-700 dark:border-blue-500 dark:bg-blue-600/15 dark:text-blue-400'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Fluxo de Caixa
          <span className="ml-2 font-mono text-xs text-slate-500 dark:text-zinc-500">({movimentacoes.length})</span>
        </Link>

        <Link
          href={`/financeiro?mes=${mesAtivo}&aba=cobrancas`}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            aba === 'cobrancas'
              ? 'border-b-2 border-blue-600 bg-blue-50 font-semibold text-blue-700 dark:border-blue-500 dark:bg-blue-600/15 dark:text-blue-400'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Cobranças Pendentes
          {cobrancas.aguardandoPagamento.length > 0 && (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 font-mono text-xs font-semibold text-red-800 dark:bg-red-500/20 dark:text-red-400">
              {cobrancas.aguardandoPagamento.length}
            </span>
          )}
        </Link>
      </nav>

      {/* Conteúdo da Aba Selecionada */}
      {aba === 'fluxo' ? (
        <Secao
          titulo="Extrato de Fluxo de Caixa"
          descricao={`Movimentações financeiras registradas em ${rotuloDoMes(periodo)}.`}
        >
          <TabelaFluxoCaixa itens={movimentacoes} />
        </Secao>
      ) : (
        <Secao
          titulo="Cobranças Pendentes"
          descricao="Apenas ordens de serviço com serviço concluído ou equipamento entregue que possuem saldo em aberto."
        >
          <TabelaCobrancasPendentes
            contas={cobrancas.aguardandoPagamento}
            totalEmAberto={totalAReceber}
          />
        </Secao>
      )}
    </>
  )
}

