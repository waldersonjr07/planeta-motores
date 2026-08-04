'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao, GradeFormulario } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { Dado, Vazio } from '@/componentes/pagina'
import { Celula, Linha, Tabela } from '@/componentes/tabela'
import { formatarReais } from '@/lib/dinheiro'
import { acaoRegistrarPagamento, acaoRemoverPagamento } from '@/modulos/financeiro/acoes'
import { CONDICOES, type CondicaoCobranca } from '@/modulos/financeiro/cobranca'
import { FORMAS_PAGAMENTO } from '@/modulos/financeiro/esquemas'

type Pagamento = {
  id: string
  valorCentavos: number
  forma: keyof typeof FORMAS_PAGAMENTO
  data: string
  observacao: string | null
}

export function AbaPagamentos({
  osId,
  pagamentos,
  resumo,
  hoje,
}: {
  osId: string
  pagamentos: Pagamento[]
  resumo: {
    totalCentavos: number
    pagoCentavos: number
    saldoCentavos: number
    condicao: CondicaoCobranca
  }
  hoje: string
}) {
  const [resultado, enviar, pendente] = useActionState(acaoRegistrarPagamento, null)

  return (
    <div className="flex flex-col gap-6">
      <dl className="flex flex-wrap gap-x-10 gap-y-3">
        <Dado rotulo="Total do serviço">{formatarReais(resumo.totalCentavos)}</Dado>
        <Dado rotulo="Pago">{formatarReais(resumo.pagoCentavos)}</Dado>
        <Dado
          rotulo="Saldo devedor"
          tom={resumo.saldoCentavos > 0 ? 'alerta' : 'ok'}
        >
          {formatarReais(resumo.saldoCentavos)}
        </Dado>
        <Dado rotulo="Situação">{CONDICOES[resumo.condicao]}</Dado>
      </dl>

      {pagamentos.length === 0 ? (
        <Vazio>Nenhum pagamento lançado.</Vazio>
      ) : (
        <Tabela
          colunas={[
            { texto: 'Data' },
            { texto: 'Forma' },
            { texto: 'Observação' },
            { texto: 'Valor', numerica: true },
            { texto: 'Ações', acao: true },
          ]}
        >
          {pagamentos.map((pagamento) => (
            <Linha key={pagamento.id}>
              <Celula>{pagamento.data.split('-').reverse().join('/')}</Celula>
              <Celula>{FORMAS_PAGAMENTO[pagamento.forma]}</Celula>
              <Celula tom="suave">{pagamento.observacao ?? '—'}</Celula>
              <Celula numerica forte>
                {formatarReais(pagamento.valorCentavos)}
              </Celula>
              <Celula numerica>
                <form action={acaoRemoverPagamento}>
                  <input type="hidden" name="pagamentoId" value={pagamento.id} />
                  <input type="hidden" name="osId" value={osId} />
                  <Botao variante="discreto" type="submit">
                    Remover
                  </Botao>
                </form>
              </Celula>
            </Linha>
          ))}
        </Tabela>
      )}

      {resumo.saldoCentavos > 0 && (
        <form action={enviar} className="flex flex-col gap-3 border-t border-borda pt-5">
          <input type="hidden" name="osId" value={osId} />

          <GradeFormulario>
            <Campo
              rotulo="Valor"
              nome="valor"
              required
              placeholder="0,00"
              className="col-span-2"
            />
            <CampoSelecao
              rotulo="Forma"
              nome="forma"
              className="col-span-3"
              opcoes={Object.entries(FORMAS_PAGAMENTO).map(([valor, texto]) => ({
                valor,
                texto,
              }))}
            />
            <Campo
              rotulo="Data"
              nome="data"
              type="date"
              defaultValue={hoje}
              className="col-span-2"
            />
            <Campo
              rotulo="Observação"
              nome="observacao"
              placeholder="Sinal, saldo…"
              className="col-span-3"
            />
            <div className="col-span-2">
              <Botao type="submit" disabled={pendente} className="w-full">
                {pendente ? 'Lançando…' : 'Lançar pagamento'}
              </Botao>
            </div>
          </GradeFormulario>

          {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
        </form>
      )}
    </div>
  )
}
