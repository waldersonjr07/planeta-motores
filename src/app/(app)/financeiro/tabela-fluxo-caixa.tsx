import Link from 'next/link'
import { Botao } from '@/componentes/botao'
import { Celula, Linha, Tabela } from '@/componentes/tabela'
import { formatarReais } from '@/lib/dinheiro'
import { acaoRemoverDespesa } from '@/modulos/financeiro/acoes'
import type { ItemFluxoCaixa } from '@/modulos/financeiro/consultas'
import { CATEGORIAS_DESPESA, type CategoriaDespesa } from '@/modulos/financeiro/esquemas'

export function TabelaFluxoCaixa({ itens }: { itens: ItemFluxoCaixa[] }) {
  if (itens.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-500 dark:text-zinc-500">
        Nenhuma entrada ou saída registrada neste mês.
      </div>
    )
  }

  return (
    <Tabela
      colunas={[
        { texto: 'Data' },
        { texto: 'Tipo' },
        { texto: 'Descrição / Origem' },
        { texto: 'Categoria' },
        { texto: 'Valor', numerica: true },
        { texto: 'Ações', acao: true },
      ]}
    >
      {itens.map((item) => {
        const dataFormatada = item.data.split('-').reverse().join('/')
        const ehEntrada = item.tipo === 'entrada'
        const categoriaTexto =
          item.categoria in CATEGORIAS_DESPESA
            ? CATEGORIAS_DESPESA[item.categoria as CategoriaDespesa]
            : item.categoria

        return (
          <Linha key={item.id}>
            <Celula mono tom="suave">{dataFormatada}</Celula>

            <Celula>
              {ehEntrada ? (
                <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                  + Entrada
                </span>
              ) : (
                <span className="inline-flex items-center rounded-md border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                  - Saída
                </span>
              )}
            </Celula>

            <Celula>
              {item.link ? (
                <Link href={item.link} className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300">
                  {item.descricao}
                </Link>
              ) : (
                <span className="text-slate-800 dark:text-zinc-200">{item.descricao}</span>
              )}
              {item.detalhe && (
                <span className="ml-2 text-xs text-slate-500 dark:text-zinc-500">({item.detalhe})</span>
              )}
            </Celula>

            <Celula tom="suave">{categoriaTexto}</Celula>

            <Celula numerica forte mono>
              {ehEntrada ? (
                <span className="text-emerald-700 dark:text-emerald-400">+{formatarReais(item.valorCentavos)}</span>
              ) : (
                <span className="text-red-700 dark:text-red-400">-{formatarReais(item.valorCentavos)}</span>
              )}
            </Celula>

            <Celula numerica>
              {item.removivel && (
                <form action={acaoRemoverDespesa}>
                  <input type="hidden" name="despesaId" value={item.id} />
                  <Botao variante="discreto" type="submit" title="Remover despesa">
                    Remover
                  </Botao>
                </form>
              )}
            </Celula>
          </Linha>
        )
      })}
    </Tabela>
  )
}
