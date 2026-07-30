import Link from 'next/link'
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
        ? 'border-t-green-600'
        : destaque === 'ruim'
          ? 'border-t-red-600'
          : 'border-t-gray-300'

  // Grupo rotulado: o mesmo valor pode aparecer em outro cartão ou nas listas
  // abaixo, e assim cada indicador continua identificável — para leitor de tela
  // e para teste.
  return (
    <div
      role="group"
      aria-label={rotulo}
      className={`flex-1 rounded border border-gray-200 border-t-4 p-4 ${borda}`}
    >
      <p className="text-xs uppercase tracking-wide text-gray-500">{rotulo}</p>
      <p className="mt-1 text-2xl font-semibold">{valor}</p>
    </div>
  )
}

export default async function PaginaPainel() {
  const painel = await obterPainel()

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Painel</h1>

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
          rotulo={`Resultado de ${rotuloDoMes(mesDe())}`}
          valor={formatarReais(painel.resultadoDoMesCentavos)}
          destaque={painel.resultadoDoMesCentavos < 0 ? 'ruim' : 'bom'}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-gray-200 p-4">
          <h2 className="font-semibold">Precisa de ação hoje</h2>
          {painel.pendencias.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">Nada parado no momento.</p>
          ) : (
            <ul className="mt-2 flex flex-col text-sm">
              {painel.pendencias.map((pendencia) => (
                <li
                  key={pendencia.osId}
                  className="flex justify-between border-b border-gray-100 py-1.5"
                >
                  <Link
                    href={`/ordens-servico/${pendencia.osId}`}
                    className="text-blue-700 hover:underline"
                  >
                    {pendencia.numero} {pendencia.clienteNome}
                  </Link>
                  <span className="text-gray-600">
                    {pendencia.motivo} · {pendencia.dias} d
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded border border-gray-200 p-4">
          <h2 className="font-semibold">Cobranças em aberto</h2>
          {painel.cobrancas.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">Ninguém devendo.</p>
          ) : (
            <ul className="mt-2 flex flex-col text-sm">
              {painel.cobrancas.map((conta) => (
                <li
                  key={conta.osId}
                  className="flex justify-between border-b border-gray-100 py-1.5"
                >
                  <Link
                    href={`/ordens-servico/${conta.osId}?aba=pagamentos`}
                    className="text-blue-700 hover:underline"
                  >
                    {conta.numero} {conta.clienteNome}
                  </Link>
                  <span className="text-gray-600">
                    {formatarReais(conta.saldoCentavos)} · {conta.diasEmAberto} d
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
