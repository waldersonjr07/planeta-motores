'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao, GradeFormulario } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { Celula, Linha, Tabela } from '@/componentes/tabela'
import { Vazio } from '@/componentes/pagina'
import { formatarReais } from '@/lib/dinheiro'
import { formatarQuantidade } from '@/lib/quantidade'
import { acaoAdicionarItem, acaoDefinirDesconto, acaoRemoverItem } from '@/modulos/os/acoes'
import type { TotaisOs } from '@/modulos/os/totais'

type Item = {
  id: string
  tipo: 'peca' | 'servico'
  descricao: string
  quantidade: string
  precoUnitarioCentavos: number
}

type OpcaoCatalogo = { valor: string; texto: string }

export function AbaOrcamento({
  osId,
  itens,
  totais,
  editavel,
  opcoes,
}: {
  osId: string
  itens: Item[]
  totais: TotaisOs
  editavel: boolean
  opcoes: { servicos: OpcaoCatalogo[]; pecas: OpcaoCatalogo[] }
}) {
  const [resultadoItem, adicionar, adicionando] = useActionState(acaoAdicionarItem, null)
  const [resultadoDesconto, salvarDesconto, salvandoDesconto] = useActionState(
    acaoDefinirDesconto,
    null,
  )
  // O tipo do item selecionado decide o que o formulário pede. Só serviço de
  // catálogo tem preço padrão; peça e item digitado exigem valor.
  const [tipoSelecionado, setTipoSelecionado] = useState<
    '' | 'servico' | 'peca' | 'outros'
  >('')
  const itemLivre = tipoSelecionado === 'outros'
  const exigeValor = tipoSelecionado === 'peca' || itemLivre

  return (
    <div className="flex flex-col gap-6">
      {itens.length === 0 ? (
        <Vazio>
          Nenhum item lançado. Escolha do catálogo ou use “Outros” para digitar.
        </Vazio>
      ) : (
        <Tabela
          colunas={[
            { texto: 'Item' },
            { texto: 'Tipo' },
            { texto: 'Qtd', numerica: true },
            { texto: 'Unitário', numerica: true },
            { texto: 'Total', numerica: true },
            { texto: 'Ações', acao: true },
          ]}
        >
          {itens.map((item) => (
            <Linha key={item.id}>
              <Celula>{item.descricao}</Celula>
              <Celula tom="suave">{item.tipo === 'peca' ? 'Peça' : 'Serviço'}</Celula>
              <Celula numerica>{formatarQuantidade(item.quantidade)}</Celula>
              <Celula numerica tom="suave">
                {formatarReais(item.precoUnitarioCentavos)}
              </Celula>
              <Celula numerica forte>
                {formatarReais(
                  Math.round(Number(item.quantidade) * item.precoUnitarioCentavos),
                )}
              </Celula>
              <Celula numerica>
                {editavel && (
                  <form action={acaoRemoverItem}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="osId" value={osId} />
                    <Botao variante="discreto" type="submit">
                      Remover
                    </Botao>
                  </form>
                )}
              </Celula>
            </Linha>
          ))}
        </Tabela>
      )}

      <div className="flex justify-end">
        <dl className="w-72 text-sm">
          <div className="flex justify-between py-1">
            <dt className="text-tinta-suave">Peças</dt>
            <dd>{formatarReais(totais.pecasCentavos)}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-tinta-suave">Serviços</dt>
            <dd>{formatarReais(totais.servicosCentavos)}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-tinta-suave">Desconto</dt>
            <dd>{formatarReais(totais.descontoCentavos)}</dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-borda pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatarReais(totais.totalCentavos)}</dd>
          </div>
        </dl>
      </div>

      {editavel && (
        <div className="flex flex-col gap-4 border-t border-borda pt-5">
          <form action={adicionar} className="flex flex-col gap-3">
            <input type="hidden" name="osId" value={osId} />

            <GradeFormulario>
              <CampoSelecao
                rotulo="Item"
                nome="item"
                required
                className="col-span-5"
                onChange={(evento) => {
                  const valor = evento.target.value
                  setTipoSelecionado(
                    valor === 'outros'
                      ? 'outros'
                      : valor.startsWith('peca:')
                        ? 'peca'
                        : valor.startsWith('servico:')
                          ? 'servico'
                          : '',
                  )
                }}
              >
                <option value="">Selecione…</option>
                {/* Fora dos grupos do catálogo: não é item de tabela. */}
                <option value="outros">Outros (digitar)</option>
                <optgroup label="Serviços">
                  {opcoes.servicos.map((opcao) => (
                    <option key={opcao.valor} value={opcao.valor}>
                      {opcao.texto}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Peças">
                  {opcoes.pecas.map((opcao) => (
                    <option key={opcao.valor} value={opcao.valor}>
                      {opcao.texto}
                    </option>
                  ))}
                </optgroup>
              </CampoSelecao>

              {itemLivre && (
                <>
                  <Campo
                    rotulo="Descrição"
                    nome="descricaoLivre"
                    required
                    className="col-span-5"
                    placeholder="Mão de obra de desmontagem, solda, busca…"
                  />
                  <CampoSelecao
                    rotulo="Cobrar como"
                    nome="tipoLivre"
                    defaultValue="servico"
                    className="col-span-2"
                    opcoes={[
                      { valor: 'servico', texto: 'Serviço' },
                      { valor: 'peca', texto: 'Peça' },
                    ]}
                  />
                </>
              )}

              <Campo
                rotulo="Quantidade"
                nome="quantidade"
                defaultValue="1"
                className="col-span-2"
              />
              <Campo
                rotulo={exigeValor ? 'Valor unitário' : 'Preço (opcional)'}
                nome="precoUnitario"
                required={exigeValor}
                className="col-span-3"
                placeholder={exigeValor ? '0,00' : 'do catálogo'}
              />

              <div className="col-span-2">
                <Botao type="submit" disabled={adicionando} className="w-full">
                  {adicionando ? 'Adicionando…' : 'Adicionar item'}
                </Botao>
              </div>
            </GradeFormulario>

            {itemLivre && (
              <p className="text-xs text-tinta-suave">
                Item digitado vale só para esta OS: não entra no catálogo e, mesmo cobrado
                como peça, não movimenta o estoque.
              </p>
            )}

            {tipoSelecionado === 'peca' && (
              <p className="text-xs text-tinta-suave">
                Peça não tem preço de tabela: informe o valor cobrado neste serviço.
              </p>
            )}

            {resultadoItem && !resultadoItem.ok && (
              <MensagemErro>{resultadoItem.erro}</MensagemErro>
            )}
          </form>

          <form action={salvarDesconto} className="flex flex-col gap-3">
            <input type="hidden" name="osId" value={osId} />
            <GradeFormulario>
              <Campo
                rotulo="Desconto"
                nome="desconto"
                className="col-span-3"
                defaultValue={
                  totais.descontoCentavos
                    ? (totais.descontoCentavos / 100).toFixed(2).replace('.', ',')
                    : ''
                }
                placeholder="0,00"
              />
              <div className="col-span-3">
                <Botao variante="secundario" type="submit" disabled={salvandoDesconto}>
                  Aplicar desconto
                </Botao>
              </div>
            </GradeFormulario>
            {resultadoDesconto && !resultadoDesconto.ok && (
              <MensagemErro>{resultadoDesconto.erro}</MensagemErro>
            )}
          </form>
        </div>
      )}
    </div>
  )
}
