import Link from 'next/link'
import { Botao } from '@/componentes/botao'
import { CabecalhoPagina, Secao, Vazio } from '@/componentes/pagina'
import { Celula, Linha, Tabela } from '@/componentes/tabela'
import { formatarReais } from '@/lib/dinheiro'
import { hoje, mesDe, rotuloDoMes } from '@/lib/periodo'
import { acaoRemoverDespesa } from '@/modulos/financeiro/acoes'
import {
  listarContasAReceber,
  listarDespesas,
  resultadoDoPeriodo,
} from '@/modulos/financeiro/consultas'
import { CATEGORIAS_DESPESA } from '@/modulos/financeiro/esquemas'
import { FormularioDespesa } from './despesa-formulario'

export default async function PaginaFinanceiro({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { mes: mesPedido } = await searchParams
  const periodo = mesDe(mesPedido ? `${mesPedido}-01` : undefined)

  const [aReceber, despesas, resultado] = await Promise.all([
    listarContasAReceber(),
    listarDespesas(periodo),
    resultadoDoPeriodo(periodo.de, periodo.ate),
  ])

  const totalAReceber = aReceber.reduce((soma, conta) => soma + conta.saldoCentavos, 0)

  return (
    <>
      <CabecalhoPagina
        titulo="Financeiro"
        descricao="Regime de caixa: entrou o que foi pago no período, saiu o que foi comprado e gasto."
      />

      <Secao
        titulo="Contas a receber"
        descricao={`Da mais antiga para a mais recente. Total em aberto: ${formatarReais(totalAReceber)}`}
      >
        {aReceber.length === 0 ? (
          <Vazio>Ninguém devendo.</Vazio>
        ) : (
          <Tabela
            colunas={[
              { texto: 'OS' },
              { texto: 'Cliente' },
              { texto: 'Total', numerica: true },
              { texto: 'Pago', numerica: true },
              { texto: 'Saldo', numerica: true },
              { texto: 'Dias', numerica: true },
            ]}
          >
            {aReceber.map((conta) => (
              <Linha key={conta.osId}>
                <Celula forte>
                  <Link
                    href={`/ordens-servico/${conta.osId}?aba=pagamentos`}
                    className="text-acao hover:underline"
                  >
                    {conta.numero}
                  </Link>
                </Celula>
                <Celula>{conta.clienteNome}</Celula>
                <Celula numerica tom="suave">
                  {formatarReais(conta.totalCentavos)}
                </Celula>
                <Celula numerica tom="suave">
                  {formatarReais(conta.pagoCentavos)}
                </Celula>
                <Celula numerica forte tom="alerta">
                  {formatarReais(conta.saldoCentavos)}
                </Celula>
                <Celula numerica>{conta.diasEmAberto}</Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Secao>

      <Secao titulo="Resultado do período" descricao={rotuloDoMes(periodo)}>
        <dl className="w-96 text-sm">
          <div className="flex justify-between py-1">
            <dt className="text-tinta-suave">Entradas (pagamentos)</dt>
            <dd>{formatarReais(resultado.entradasCentavos)}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-tinta-suave">Compras de peça</dt>
            <dd>-{formatarReais(resultado.comprasCentavos)}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-tinta-suave">Outras despesas</dt>
            <dd>-{formatarReais(resultado.despesasCentavos)}</dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-borda pt-2 text-base font-semibold">
            <dt>Resultado</dt>
            <dd className={resultado.resultadoCentavos < 0 ? 'text-alerta' : 'text-ok'}>
              {formatarReais(resultado.resultadoCentavos)}
            </dd>
          </div>
        </dl>
      </Secao>

      <Secao titulo="Despesas" descricao={rotuloDoMes(periodo)}>
        <div className="flex flex-col gap-5">
          {despesas.length === 0 ? (
            <Vazio>Nenhuma despesa lançada no período.</Vazio>
          ) : (
            <Tabela
              colunas={[
                { texto: 'Data' },
                { texto: 'Categoria' },
                { texto: 'Descrição' },
                { texto: 'Valor', numerica: true },
                { texto: 'Ações', acao: true },
              ]}
            >
              {despesas.map((despesa) => (
                <Linha key={despesa.id}>
                  <Celula>{despesa.data.split('-').reverse().join('/')}</Celula>
                  <Celula tom="suave">{CATEGORIAS_DESPESA[despesa.categoria]}</Celula>
                  <Celula>{despesa.descricao ?? '—'}</Celula>
                  <Celula numerica forte>
                    {formatarReais(despesa.valorCentavos)}
                  </Celula>
                  <Celula numerica>
                    <form action={acaoRemoverDespesa}>
                      <input type="hidden" name="despesaId" value={despesa.id} />
                      <Botao variante="discreto" type="submit">
                        Remover
                      </Botao>
                    </form>
                  </Celula>
                </Linha>
              ))}
            </Tabela>
          )}

          <div className="border-t border-borda pt-5">
            <FormularioDespesa hoje={hoje()} />
          </div>
        </div>
      </Secao>
    </>
  )
}
