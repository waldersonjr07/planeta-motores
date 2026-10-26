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
      ? 'border-t-amber-500'
      : destaque === 'bom'
        ? 'border-t-emerald-500'
        : destaque === 'ruim'
          ? 'border-t-red-500'
          : 'border-t-slate-300 dark:border-t-zinc-700'

  return (
    <div
      role="group"
      aria-label={rotulo}
      className={`min-w-44 flex-1 rounded-lg border border-slate-200 border-t-4 bg-white px-5 py-4 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none ${borda}`}
    >
      <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-zinc-500">{rotulo}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">{valor}</p>
    </div>
  )
}

/**
 * O texto é para quem abre esta tela todo dia, que não administra a VPS: diz
 * que há algo errado e a quem recorrer, e para por aí.
 */
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
                  className="flex items-baseline justify-between gap-3 border-b border-zinc-800/80 py-2.5 last:border-0"
                >
                  <Link
                    href={`/ordens-servico/${pendencia.osId}`}
                    className="text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    <span className="font-mono font-medium">{pendencia.numero}</span> {pendencia.clienteNome}
                  </Link>
                  <span className="shrink-0 text-zinc-400">
                    {pendencia.motivo} · <span className="font-mono">{pendencia.dias}</span> d
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
                  className="flex items-baseline justify-between gap-3 border-b border-zinc-800/80 py-2.5 last:border-0"
                >
                  <Link
                    href={`/ordens-servico/${conta.osId}?aba=pagamentos`}
                    className="text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    <span className="font-mono font-medium">{conta.numero}</span> {conta.clienteNome}
                  </Link>
                  <span className="shrink-0 text-zinc-400">
                    <span className="font-mono">{formatarReais(conta.saldoCentavos)}</span>
                    {conta.diasEmAberto !== null && (
                      <> · <span className="font-mono">{conta.diasEmAberto}</span> d</>
                    )}
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
