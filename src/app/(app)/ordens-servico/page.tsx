import Link from 'next/link'
import { LinkBotao } from '@/componentes/botao'
import { Etiqueta, type Tom } from '@/componentes/etiqueta'
import { CabecalhoPagina, Cartao, Vazio } from '@/componentes/pagina'
import { Celula, Linha, Tabela } from '@/componentes/tabela'
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

/**
 * Cancelada não some do sistema — some da lista. Serviço que não vai acontecer
 * só atrapalha quem procura trabalho de verdade, e o histórico continua a um
 * filtro de distância. `devolvido` e `recusado` ficam: o cliente recusou o
 * orçamento e levou a máquina, o que é desfecho e não engano.
 */
const VISIVEIS_POR_PADRAO: SituacaoOs[] = (Object.keys(SITUACOES) as SituacaoOs[]).filter(
  (situacao) => situacao !== 'cancelado',
)

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

export default async function PaginaOrdensServico({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; situacao?: string }>
}) {
  const { busca, situacao } = await searchParams

  const situacoes =
    situacao === 'todas'
      ? undefined
      : situacao === 'na_oficina'
        ? NA_OFICINA
        : situacao && situacao in SITUACOES
          ? [situacao as SituacaoOs]
          : VISIVEIS_POR_PADRAO

  const lista = await listarOs({ busca, situacoes })

  return (
    <>
      <CabecalhoPagina
        titulo="Ordens de serviço"
        acoes={
          <LinkBotao href="/ordens-servico/nova" variante="primario">
            Nova OS
          </LinkBotao>
        }
      />

      <Cartao barra={<FiltrosOs />}>
        {lista.length === 0 ? (
          <Vazio>
            {busca || situacao
              ? 'Nenhuma ordem de serviço encontrada com esses filtros.'
              : 'Nenhuma ordem de serviço aberta ainda. Comece abrindo uma em “Nova OS”.'}
          </Vazio>
        ) : (
          <Tabela
            colunas={[
              { texto: 'OS' },
              { texto: 'Cliente' },
              { texto: 'Equipamento' },
              { texto: 'Situação' },
              { texto: 'Recebido' },
              { texto: 'Valor', numerica: true },
            ]}
          >
            {lista.map((os) => (
              <Linha key={os.id}>
                <Celula forte>
                  <Link
                    href={`/ordens-servico/${os.id}`}
                    className="text-acao hover:underline"
                  >
                    {os.numero}
                  </Link>
                </Celula>
                <Celula>{os.clienteNome}</Celula>
                <Celula tom="suave">{os.equipamentoDescricao}</Celula>
                <Celula>
                  <Etiqueta tom={TOM_DA_SITUACAO[os.situacao]}>
                    {SITUACOES[os.situacao]}
                  </Etiqueta>
                </Celula>
                <Celula tom="suave">{formatarData(os.recebidoEm)}</Celula>
                <Celula numerica forte={os.totalCentavos > 0}>
                  {os.totalCentavos > 0 ? formatarReais(os.totalCentavos) : '—'}
                </Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Cartao>
    </>
  )
}
