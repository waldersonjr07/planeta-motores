'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/componentes/botao'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { formatarReais } from '@/lib/dinheiro'
import { formatarQuantidade } from '@/lib/quantidade'
import {
  acaoAdicionarItem,
  acaoDefinirDesconto,
  acaoRemoverItem,
} from '@/modulos/os/acoes'
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
  const [itemLivre, setItemLivre] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      {itens.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhum item lançado ainda.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-600">
            <tr>
              <th className="py-2">Item</th>
              <th className="py-2">Tipo</th>
              <th className="py-2 text-right">Qtd</th>
              <th className="py-2 text-right">Unitário</th>
              <th className="py-2 text-right">Total</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-2">{item.descricao}</td>
                <td className="py-2 text-gray-600">
                  {item.tipo === 'peca' ? 'Peça' : 'Serviço'}
                </td>
                <td className="py-2 text-right">{formatarQuantidade(item.quantidade)}</td>
                <td className="py-2 text-right">
                  {formatarReais(item.precoUnitarioCentavos)}
                </td>
                <td className="py-2 text-right">
                  {formatarReais(
                    Math.round(Number(item.quantidade) * item.precoUnitarioCentavos),
                  )}
                </td>
                <td className="py-2 text-right">
                  {editavel && (
                    <form action={acaoRemoverItem}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="osId" value={osId} />
                      <Botao variante="secundario" type="submit">
                        Remover
                      </Botao>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex justify-end">
        <dl className="w-64 text-sm">
          <div className="flex justify-between py-0.5">
            <dt className="text-gray-600">Peças</dt>
            <dd>{formatarReais(totais.pecasCentavos)}</dd>
          </div>
          <div className="flex justify-between py-0.5">
            <dt className="text-gray-600">Serviços</dt>
            <dd>{formatarReais(totais.servicosCentavos)}</dd>
          </div>
          <div className="flex justify-between py-0.5">
            <dt className="text-gray-600">Desconto</dt>
            <dd>{formatarReais(totais.descontoCentavos)}</dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-gray-200 pt-1 font-semibold">
            <dt>Total</dt>
            <dd>{formatarReais(totais.totalCentavos)}</dd>
          </div>
        </dl>
      </div>

      {editavel && (
        <>
          <form
            action={adicionar}
            className="flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4"
          >
            <input type="hidden" name="osId" value={osId} />

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-700">Item</span>
              <select
                name="item"
                required
                onChange={(evento) => setItemLivre(evento.target.value === 'outros')}
                className="w-72 rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Selecione…</option>
                {/* Fora dos grupos do catálogo de propósito: não é item de tabela. */}
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
              </select>
            </label>

            {itemLivre && (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-700">Descrição</span>
                  <input
                    name="descricaoLivre"
                    required
                    placeholder="Mão de obra de desmontagem, solda, busca…"
                    className="w-80 rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-700">Cobrar como</span>
                  <select
                    name="tipoLivre"
                    defaultValue="servico"
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="servico">Serviço</option>
                    <option value="peca">Peça</option>
                  </select>
                </label>
              </>
            )}

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-700">Quantidade</span>
              <input
                name="quantidade"
                defaultValue="1"
                className="w-24 rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-700">
                {itemLivre ? 'Valor unitário' : 'Preço (opcional)'}
              </span>
              <input
                name="precoUnitario"
                required={itemLivre}
                placeholder={itemLivre ? '0,00' : 'do catálogo'}
                className="w-32 rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </label>

            <Botao type="submit" disabled={adicionando}>
              {adicionando ? 'Adicionando…' : 'Adicionar item'}
            </Botao>

            {resultadoItem && !resultadoItem.ok && (
              <MensagemErro>{resultadoItem.erro}</MensagemErro>
            )}
          </form>

          {itemLivre && (
            <p className="-mt-2 text-xs text-gray-600">
              Item digitado vale só para esta OS: não entra no catálogo e, mesmo cobrado
              como peça, não movimenta o estoque.
            </p>
          )}

          <form action={salvarDesconto} className="flex items-end gap-3">
            <input type="hidden" name="osId" value={osId} />
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-700">Desconto</span>
              <input
                name="desconto"
                defaultValue={
                  totais.descontoCentavos ? (totais.descontoCentavos / 100).toFixed(2).replace('.', ',') : ''
                }
                placeholder="0,00"
                className="w-32 rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <Botao variante="secundario" type="submit" disabled={salvandoDesconto}>
              Aplicar desconto
            </Botao>
            {resultadoDesconto && !resultadoDesconto.ok && (
              <MensagemErro>{resultadoDesconto.erro}</MensagemErro>
            )}
          </form>
        </>
      )}
    </div>
  )
}
