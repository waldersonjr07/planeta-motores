import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatarDataHora } from '@/lib/datas'
import { formatarReais } from '@/lib/dinheiro'
import { hoje } from '@/lib/periodo'
import { listarPecas } from '@/modulos/catalogo/pecas-consultas'
import { listarServicos } from '@/modulos/catalogo/servicos-consultas'
import { obterConfiguracoes } from '@/modulos/configuracoes/consultas'
import {
  listarPagamentosDaOs,
  resumoDeCobrancaDaOs,
} from '@/modulos/financeiro/consultas'
import { CONDICOES } from '@/modulos/financeiro/cobranca'
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
    <section className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">OS {os.numero}</h1>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-sm">
              {SITUACOES[situacao]}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-700">
            <Link
              href={`/clientes/${os.cliente.id}`}
              className="text-blue-700 hover:underline"
            >
              {os.cliente.nome}
            </Link>
            {' · '}
            {os.equipamento.descricao}
            {os.equipamento.numeroSerie && ` · série ${os.equipamento.numeroSerie}`}
          </p>
          <p className="mt-1 text-sm font-semibold">
            Total {formatarReais(os.totais.totalCentavos)}
            <span className="ml-2 font-normal text-gray-600">
              cobrança {CONDICOES[cobranca.condicao].toLowerCase()}
            </span>
            {os.versaoOrcamento > 0 && (
              <span className="ml-2 font-normal text-gray-600">
                · orçamento versão {os.versaoOrcamento}
              </span>
            )}
          </p>
        </div>

        <AcoesSituacao osId={os.id} situacao={situacao} />
      </header>

      {/* Aviso, não bloqueio: entregar devendo é decisão da Lucilene. */}
      {situacao === 'pronto' && cobranca.saldoCentavos > 0 && (
        <p className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Esta ordem tem <strong>{formatarReais(cobranca.saldoCentavos)}</strong> em aberto. A
          entrega não fica bloqueada — o saldo continua em contas a receber.
        </p>
      )}

      <nav className="flex gap-4 border-b border-gray-200 pb-2 text-sm">
        {ABAS.map((item) => (
          <Link
            key={item.chave}
            href={`/ordens-servico/${id}?aba=${item.chave}`}
            className={
              item.chave === aba
                ? 'font-semibold text-gray-900'
                : 'text-blue-700 hover:underline'
            }
          >
            {item.titulo}
            {contadores[item.chave] ? ` (${contadores[item.chave]})` : ''}
          </Link>
        ))}
      </nav>

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
            pecas: pecas.map((p) => ({
              valor: `peca:${p.id}`,
              texto: `${p.nome}${p.marca ? ` ${p.marca}` : ''} — ${formatarReais(p.precoVendaCentavos)}`,
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
        <ol className="flex flex-col gap-2 text-sm">
          {os.historico.map((linha) => (
            <li
              key={linha.id}
              className="flex flex-wrap items-baseline gap-2 border-b border-gray-100 pb-2"
            >
              <span className="w-36 text-gray-600">{formatarDataHora(linha.criadoEm)}</span>
              <span className="font-medium">
                {linha.situacaoAnterior
                  ? `${SITUACOES[linha.situacaoAnterior as SituacaoOs]} → ${SITUACOES[linha.situacaoNova as SituacaoOs]}`
                  : SITUACOES[linha.situacaoNova as SituacaoOs]}
              </span>
              {linha.observacao && (
                <span className="text-gray-600">· {linha.observacao}</span>
              )}
            </li>
          ))}
        </ol>
      )}

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
    </section>
  )
}
