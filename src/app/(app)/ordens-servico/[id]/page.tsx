import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Etiqueta, type Tom } from '@/componentes/etiqueta'
import { Cartao } from '@/componentes/pagina'
import { Voltar } from '@/componentes/voltar'
import { formatarDataHora } from '@/lib/datas'
import { formatarReais } from '@/lib/dinheiro'
import { hoje } from '@/lib/periodo'
import { listarPecas } from '@/modulos/catalogo/pecas-consultas'
import { listarServicos } from '@/modulos/catalogo/servicos-consultas'
import { obterConfiguracoes } from '@/modulos/configuracoes/consultas'
import { CONDICOES } from '@/modulos/financeiro/cobranca'
import { listarPagamentosDaOs, resumoDeCobrancaDaOs } from '@/modulos/financeiro/consultas'
import { obterOs } from '@/modulos/os/consultas'
import { SITUACOES, aceitaAlteracaoDeItem, type SituacaoOs } from '@/modulos/os/situacoes'
import { AbaDiagnostico } from './aba-diagnostico'
import { AbaFotos } from './aba-fotos'
import { AbaOrcamento } from './aba-orcamento'
import { AbaPagamentos } from './aba-pagamentos'
import { AcoesSituacao } from './acoes-situacao'
import { DocumentosEAvisos } from './documentos-e-avisos'

const ABAS = [
  { chave: 'diagnostico', titulo: 'Diagnóstico' },
  { chave: 'orcamento', titulo: 'Orçamento' },
  { chave: 'fotos', titulo: 'Fotos' },
  { chave: 'pagamentos', titulo: 'Pagamentos' },
  { chave: 'historico', titulo: 'Histórico' },
] as const

const TOM_DA_SITUACAO: Record<SituacaoOs, Tom> = {
  recebido: 'neutro',
  em_diagnostico: 'andamento',
  orcamento_enviado: 'atencao',
  aprovado: 'andamento',
  aguardando_peca: 'alerta',
  em_execucao: 'andamento',
  pronto: 'ok',
  entregue: 'encerrado',
  recusado: 'encerrado',
  devolvido: 'encerrado',
  cancelado: 'encerrado',
}

export default async function FichaOs({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ aba?: string }>
}) {
  const { id } = await params
  const { aba: abaPedida } = await searchParams
  const aba = ABAS.some((a) => a.chave === abaPedida) ? abaPedida! : 'diagnostico'

  const os = await obterOs(id)
  if (!os) notFound()

  const situacao = os.situacao as SituacaoOs
  const editavel = aceitaAlteracaoDeItem(situacao)

  const [servicos, pecas, cobranca, pagamentos, configuracoes] = await Promise.all([
    listarServicos(),
    listarPecas(),
    resumoDeCobrancaDaOs(id),
    listarPagamentosDaOs(id),
    obterConfiguracoes(),
  ])

  const contadores: Record<string, number> = {
    orcamento: os.itens.length,
    fotos: os.fotos.length,
    pagamentos: pagamentos.length,
    historico: os.historico.length,
  }

  return (
    <>
      <div className="flex justify-end">
        <Voltar href="/ordens-servico" texto="Voltar para ordens de serviço" />
      </div>

      {/* Hero Card Consolidado no topo da OS */}
      <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
        {/* Linha superior com Identificação, Situação, Cliente e Ações */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-zinc-800">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                OS {os.numero}
              </h1>
              <Etiqueta tom={TOM_DA_SITUACAO[situacao]}>{SITUACOES[situacao]}</Etiqueta>
              {os.versaoOrcamento > 0 && (
                <span className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                  Orçamento v{os.versaoOrcamento}
                </span>
              )}
            </div>

            <p className="mt-1.5 text-sm text-slate-600 dark:text-zinc-400">
              <Link
                href={`/clientes/${os.cliente.id}`}
                className="font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              >
                {os.cliente.nome}
              </Link>
              {' · '}
              <span className="text-slate-800 dark:text-zinc-300">{os.equipamento.descricao}</span>
              {os.equipamento.numeroSerie && (
                <> · série <span className="font-mono text-slate-600 dark:text-zinc-400">{os.equipamento.numeroSerie}</span></>
              )}
            </p>
          </div>

          <AcoesSituacao
            osId={os.id}
            situacao={situacao}
            pagoCentavos={cobranca.pagoCentavos}
          />
        </div>

        {/* 4 Indicadores Financeiros Consolidados do Hero Card */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 p-3.5 transition-colors dark:border-zinc-800/80 dark:bg-zinc-950/60">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">
              Valor Total
            </span>
            <span className="font-mono text-xl font-bold text-slate-900 dark:text-zinc-100">
              {formatarReais(os.totais.totalCentavos)}
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 p-3.5 transition-colors dark:border-zinc-800/80 dark:bg-zinc-950/60">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">
              Valor Pago
            </span>
            <span
              className={`font-mono text-xl font-bold ${
                cobranca.pagoCentavos > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-zinc-400'
              }`}
            >
              {formatarReais(cobranca.pagoCentavos)}
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 p-3.5 transition-colors dark:border-zinc-800/80 dark:bg-zinc-950/60">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">
              Saldo Devedor
            </span>
            <span
              className={`font-mono text-xl font-bold ${
                cobranca.saldoCentavos > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {formatarReais(cobranca.saldoCentavos)}
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 p-3.5 transition-colors dark:border-zinc-800/80 dark:bg-zinc-950/60">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">
              Situação da Cobrança
            </span>
            <div className="mt-0.5">
              <span
                className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                  cobranca.condicao === 'quitada'
                    ? 'border border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : cobranca.condicao === 'parcial' || cobranca.condicao === 'em_aberto'
                      ? 'border border-red-200 bg-red-100 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400'
                      : 'border border-slate-300 bg-slate-100 text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                }`}
              >
                {CONDICOES[cobranca.condicao]}
              </span>
            </div>
          </div>
        </div>

        {/* Aviso de atenção quando concluída com saldo pendente */}
        {situacao === 'pronto' && cobranca.saldoCentavos > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <span aria-hidden="true">⚠️</span>
            <span>
              Esta ordem tem <strong className="font-mono">{formatarReais(cobranca.saldoCentavos)}</strong> em aberto. A entrega não fica bloqueada — o saldo continua em contas a receber.
            </span>
          </div>
        )}
      </div>

      <Cartao
        barra={
          <nav aria-label="Seções da ordem de serviço" className="flex flex-wrap gap-1">
            {ABAS.map((item) => {
              const ativa = item.chave === aba
              return (
                <Link
                  key={item.chave}
                  href={`/ordens-servico/${id}?aba=${item.chave}`}
                  aria-current={ativa ? 'page' : undefined}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    ativa
                      ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-blue-600/20 dark:text-blue-400'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {item.titulo}
                  {contadores[item.chave] ? (
                    <span className="ml-1.5 font-mono text-xs text-slate-500 dark:text-zinc-500">
                      ({contadores[item.chave]})
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </nav>
        }
      >
        {aba === 'diagnostico' && (
          <AbaDiagnostico
            osId={os.id}
            problemaRelatado={os.problemaRelatado}
            diagnostico={os.diagnostico}
            acessoriosRecebidos={os.acessoriosRecebidos}
          />
        )}

        {aba === 'orcamento' && (
          <AbaOrcamento
            osId={os.id}
            itens={os.itens.map((item) => ({
              id: item.id,
              tipo: item.tipo,
              descricao: item.descricao,
              quantidade: item.quantidade,
              precoUnitarioCentavos: item.precoUnitarioCentavos,
            }))}
            totais={os.totais}
            editavel={editavel}
            opcoes={{
              servicos: servicos.map((s) => ({
                valor: `servico:${s.id}`,
                texto: `${s.nome} — ${formatarReais(s.precoPadraoCentavos)}`,
              })),
              // Peça não tem preço de tabela: o valor é digitado a cada OS.
              pecas: pecas.map((p) => ({
                valor: `peca:${p.id}`,
                texto: `${p.nome}${p.marca ? ` ${p.marca}` : ''} (${p.unidade})`,
              })),
            }}
          />
        )}

        {aba === 'fotos' && <AbaFotos osId={os.id} fotos={os.fotos} />}

        {aba === 'pagamentos' && (
          <AbaPagamentos
            osId={os.id}
            pagamentos={pagamentos.map((pagamento) => ({
              id: pagamento.id,
              valorCentavos: pagamento.valorCentavos,
              forma: pagamento.forma,
              data: pagamento.data,
              observacao: pagamento.observacao,
            }))}
            resumo={cobranca}
            hoje={hoje()}
          />
        )}

        {aba === 'historico' && (
          <ol className="flex flex-col">
            {os.historico.map((linha) => (
              <li
                key={linha.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-borda py-2.5 text-sm last:border-0"
              >
                <span className="w-36 shrink-0 text-tinta-fraca">
                  {formatarDataHora(linha.criadoEm)}
                </span>
                <span className="font-medium">
                  {linha.situacaoAnterior
                    ? `${SITUACOES[linha.situacaoAnterior as SituacaoOs]} → ${SITUACOES[linha.situacaoNova as SituacaoOs]}`
                    : SITUACOES[linha.situacaoNova as SituacaoOs]}
                </span>
                {linha.observacao && (
                  <span className="text-tinta-suave">· {linha.observacao}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </Cartao>

      <DocumentosEAvisos
        osId={os.id}
        telefone={os.cliente.telefone}
        modelos={{
          orcamento: configuracoes.modeloMsgOrcamento,
          pronto: configuracoes.modeloMsgPronto,
          cobranca: configuracoes.modeloMsgCobranca,
        }}
        valores={{
          cliente: os.cliente.nome,
          numero: os.numero,
          equipamento: os.equipamento.descricao,
          total: formatarReais(os.totais.totalCentavos),
          saldo: formatarReais(cobranca.saldoCentavos),
        }}
        temItens={os.itens.length > 0}
        temSaldo={cobranca.saldoCentavos > 0}
      />
    </>
  )
}
