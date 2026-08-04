import Link from 'next/link'
import { CabecalhoPagina, Secao, Vazio } from '@/componentes/pagina'
import { formatarReais } from '@/lib/dinheiro'
import { mesDe, rotuloDoMes } from '@/lib/periodo'
import { obterPainel } from '@/modulos/painel/consultas'

function Indicador({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string
  valor: string
  destaque?: 'atencao' | 'bom' | 'ruim'
}) {
  const borda =
    destaque === 'atencao'
      ? 'border-t-atencao'
      : destaque === 'bom'
        ? 'border-t-ok'
        : destaque === 'ruim'
          ? 'border-t-alerta'
          : 'border-t-borda-forte'

  // Grupo rotulado: o mesmo valor pode aparecer em outro cartão ou nas listas
  // abaixo, e assim cada indicador continua identificável — para leitor de tela
  // e para teste.
  return (
    <div
      role="group"
      aria-label={rotulo}
      className={`min-w-44 flex-1 rounded-lg border border-borda border-t-4 bg-superficie px-5 py-4 ${borda}`}
    >
      <p className="text-xs uppercase tracking-wide text-tinta-fraca">{rotulo}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{valor}</p>
    </div>
  )
}

export default async function PaginaPainel() {
  const painel = await obterPainel()

  return (
    <>
      <CabecalhoPagina
        titulo="Painel"
        descricao={`O que está parado e o que está em aberto. Resultado referente a ${rotuloDoMes(mesDe())}.`}
      />

      <div className="flex flex-wrap gap-3">
        <Indicador rotulo="Na oficina" valor={String(painel.naOficina)} />
        <Indicador
          rotulo="Aguard. aprovação"
          valor={String(painel.aguardandoAprovacao)}
          destaque={painel.aguardandoAprovacao > 0 ? 'atencao' : undefined}
        />
        <Indicador
          rotulo="Pronto p/ entrega"
          valor={String(painel.prontoParaEntrega)}
          destaque={painel.prontoParaEntrega > 0 ? 'bom' : undefined}
        />
        <Indicador
          rotulo="A receber"
          valor={formatarReais(painel.aReceberCentavos)}
          destaque={painel.aReceberCentavos > 0 ? 'ruim' : undefined}
        />
        {/* Rótulo curto para não quebrar em duas linhas e desalinhar o valor;
            o mês vai na descrição da página. Zero fica neutro: não é lucro. */}
        <Indicador
          rotulo="Resultado do mês"
          valor={formatarReais(painel.resultadoDoMesCentavos)}
          destaque={
            painel.resultadoDoMesCentavos < 0
              ? 'ruim'
              : painel.resultadoDoMesCentavos > 0
                ? 'bom'
                : undefined
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Secao titulo="Precisa de ação hoje">
          {painel.pendencias.length === 0 ? (
            <Vazio>Nada parado no momento.</Vazio>
          ) : (
            <ul className="flex flex-col text-sm">
              {painel.pendencias.map((pendencia) => (
                <li
                  key={pendencia.osId}
                  className="flex items-baseline justify-between gap-3 border-b border-borda py-2 last:border-0"
                >
                  <Link
                    href={`/ordens-servico/${pendencia.osId}`}
                    className="text-acao hover:underline"
                  >
                    {pendencia.numero} {pendencia.clienteNome}
                  </Link>
                  <span className="shrink-0 text-tinta-suave">
                    {pendencia.motivo} · {pendencia.dias} d
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao titulo="Cobranças em aberto">
          {painel.cobrancas.length === 0 ? (
            <Vazio>Ninguém devendo.</Vazio>
          ) : (
            <ul className="flex flex-col text-sm">
              {painel.cobrancas.map((conta) => (
                <li
                  key={conta.osId}
                  className="flex items-baseline justify-between gap-3 border-b border-borda py-2 last:border-0"
                >
                  <Link
                    href={`/ordens-servico/${conta.osId}?aba=pagamentos`}
                    className="text-acao hover:underline"
                  >
                    {conta.numero} {conta.clienteNome}
                  </Link>
                  <span className="shrink-0 text-tinta-suave">
                    {formatarReais(conta.saldoCentavos)} · {conta.diasEmAberto} d
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Secao>
      </div>
    </>
  )
}
