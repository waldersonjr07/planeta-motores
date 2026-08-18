import Link from 'next/link'
import { CabecalhoPagina, Secao, Vazio } from '@/componentes/pagina'
import { formatarReais } from '@/lib/dinheiro'
import { mesDe, rotuloDoMes } from '@/lib/periodo'
import { obterEstadoDoBackup } from '@/modulos/backup/consultas'
import { precisaAvisar } from '@/modulos/backup/estado'
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

/**
 * O texto é para quem abre esta tela todo dia, que não administra a VPS: diz
 * que há algo errado e a quem recorrer, e para por aí. Nada de data, de nome de
 * arquivo ou do estado da cópia externa — informação que ela não tem como usar
 * só ensinaria a ignorar o aviso.
 *
 * Some por completo quando o backup está em dia. Um "tudo certo" fixo na tela
 * vira parte do cenário em uma semana, e aí não avisa mais nada.
 */
function AvisoDeBackup() {
  return (
    <p
      role="alert"
      className="rounded-lg border border-alerta/30 bg-alerta-fundo px-5 py-4 text-sm text-alerta"
    >
      A cópia de segurança do sistema não está sendo feita. Avise o Walderson.
    </p>
  )
}

export default async function PaginaPainel() {
  const [painel, backup] = await Promise.all([obterPainel(), obterEstadoDoBackup()])

  return (
    <>
      <CabecalhoPagina
        titulo="Painel"
        descricao={`O que está parado e o que está em aberto. Resultado referente a ${rotuloDoMes(mesDe())}.`}
      />

      {backup && precisaAvisar(backup) && <AvisoDeBackup />}

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
