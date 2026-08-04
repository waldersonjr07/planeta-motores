import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Etiqueta, type Tom } from '@/componentes/etiqueta'
import { Cartao, Dado } from '@/componentes/pagina'
import { Voltar } from '@/componentes/voltar'
import { formatarDataHora } from '@/lib/datas'
import { formatarReais } from '@/lib/dinheiro'
import { hoje } from '@/lib/periodo'
import { listarPecas } from '@/modulos/catalogo/pecas-consultas'
import { listarServicos } from '@/modulos/catalogo/servicos-consultas'
import { obterConfiguracoes } from '@/modulos/configuracoes/consultas'
import { CONDICOES, type CondicaoCobranca } from '@/modulos/financeiro/cobranca'
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

const TOM_DA_COBRANCA: Record<CondicaoCobranca, 'neutro' | 'alerta' | 'ok'> = {
  sem_valor: 'neutro',
  em_aberto: 'alerta',
  parcial: 'alerta',
  quitada: 'ok',
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

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* O número é como a oficina fala da OS: é ele que ancora a ficha. */}
            <h1 className="text-2xl font-semibold tracking-tight">OS {os.numero}</h1>
            <Etiqueta tom={TOM_DA_SITUACAO[situacao]}>{SITUACOES[situacao]}</Etiqueta>
          </div>

          <p className="mt-1.5 text-sm text-tinta-suave">
            <Link
              href={`/clientes/${os.cliente.id}`}
              className="text-acao hover:underline"
            >
              {os.cliente.nome}
            </Link>
            {' · '}
            {os.equipamento.descricao}
            {os.equipamento.numeroSerie && ` · série ${os.equipamento.numeroSerie}`}
          </p>
        </div>

        <AcoesSituacao osId={os.id} situacao={situacao} />
      </header>

      {/*
        Grupo nomeado: os mesmos valores reaparecem na aba de orçamento e na de
        pagamentos, e é daqui que se lê o resumo da OS.
      */}
      <dl
        role="group"
        aria-label="Resumo da OS"
        className="flex flex-wrap gap-x-10 gap-y-3 rounded-lg border border-borda bg-superficie px-5 py-4"
      >
        <Dado rotulo="Total">{formatarReais(os.totais.totalCentavos)}</Dado>
        <Dado rotulo="Cobrança" tom={TOM_DA_COBRANCA[cobranca.condicao]}>
          {CONDICOES[cobranca.condicao]}
        </Dado>
        {cobranca.saldoCentavos > 0 && (
          <Dado rotulo="Saldo devedor" tom="alerta">
            {formatarReais(cobranca.saldoCentavos)}
          </Dado>
        )}
        {os.versaoOrcamento > 0 && (
          <Dado rotulo="Orçamento">versão {os.versaoOrcamento}</Dado>
        )}
      </dl>

      {/* Aviso, não bloqueio: entregar devendo é decisão da Lucilene. */}
      {situacao === 'pronto' && cobranca.saldoCentavos > 0 && (
        <p className="rounded-lg border border-atencao-borda bg-atencao-fundo px-5 py-3 text-sm text-atencao">
          Esta ordem tem <strong>{formatarReais(cobranca.saldoCentavos)}</strong> em aberto. A
          entrega não fica bloqueada — o saldo continua em contas a receber.
        </p>
      )}

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
                  className={`rounded-md px-3 py-1.5 text-sm ${
                    ativa
                      ? 'bg-acao-fundo font-medium text-acao-escura'
                      : 'text-tinta-suave hover:bg-realce hover:text-tinta'
                  }`}
                >
                  {item.titulo}
                  {contadores[item.chave] ? (
                    <span className="ml-1.5 text-tinta-fraca">
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
