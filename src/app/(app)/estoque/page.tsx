import Link from 'next/link'
import { Botao } from '@/componentes/botao'
import { Etiqueta } from '@/componentes/etiqueta'
import { CabecalhoPagina, Secao, Vazio } from '@/componentes/pagina'
import { Celula, Linha, Tabela } from '@/componentes/tabela'
import { formatarQuantidade } from '@/lib/quantidade'
import { acaoDefinirAtivoPeca } from '@/modulos/catalogo/acoes'
import { listarSaldos } from '@/modulos/estoque/consultas'
import { ModalAjusteEstoque } from './modal-ajuste'
import { ModalNovaPeca } from './modal-peca'

export default async function PaginaEstoque({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>
}) {
  const { filtro } = await searchParams
  const saldos = await listarSaldos()
  const aRepor = saldos.filter((peca) => peca.abaixoDoMinimo)
  const filtrandoRepor = filtro === 'repor'
  const listaExibida = filtrandoRepor ? aRepor : saldos

  const pecasParaAjuste = saldos.map((peca) => ({
    id: peca.id,
    nome: peca.nome,
    unidade: peca.unidade,
    saldo: peca.saldo,
  }))

  return (
    <>
      <CabecalhoPagina
        titulo="Estoque"
        descricao="Consumível guardado na oficina controla saldo. Peça específica, comprada só quando o serviço pede, não precisa."
        acoes={
          <div className="flex items-center gap-2">
            <ModalAjusteEstoque pecas={pecasParaAjuste} />
            <ModalNovaPeca />
          </div>
        }
      />

      {/* Barra de Filtros Rápidos */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/estoque"
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            !filtrandoRepor
              ? 'border border-slate-300 bg-slate-200 text-slate-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100'
              : 'border border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Todas as peças ({saldos.length})
        </Link>

        {aRepor.length > 0 && (
          <Link
            href={filtrandoRepor ? '/estoque' : '/estoque?filtro=repor'}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              filtrandoRepor
                ? 'border-amber-400 bg-amber-100 font-semibold text-amber-900 dark:border-amber-500 dark:bg-amber-500/20 dark:text-amber-300'
                : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20'
            }`}
          >
            <span aria-hidden="true">⚠️</span>
            <span>
              {aRepor.length} {aRepor.length === 1 ? 'peça abaixo do mínimo' : 'peças abaixo do mínimo'}
            </span>
          </Link>
        )}
      </div>

      <Secao
        titulo={filtrandoRepor ? 'Peças que precisam de reposição' : 'Peças em estoque'}
        descricao={
          filtrandoRepor
            ? 'Exibindo somente itens cujo saldo atual está abaixo da quantidade mínima cadastrada.'
            : undefined
        }
      >
        {listaExibida.length === 0 ? (
          <Vazio>
            {filtrandoRepor
              ? 'Nenhuma peça abaixo do mínimo no momento. O estoque está em dia!'
              : 'Nenhuma peça cadastrada ainda. Comece em “+ Nova Peça”.'}
          </Vazio>
        ) : (
          <Tabela
            colunas={[
              { texto: 'Peça' },
              { texto: 'Unidade' },
              { texto: 'Saldo', numerica: true },
              { texto: 'Mínimo', numerica: true },
              { texto: 'Controle' },
              { texto: 'Ações', acao: true },
            ]}
          >
            {listaExibida.map((peca) => (
              <Linha key={peca.id}>
                <Celula>
                  <span className="font-medium text-slate-900 dark:text-zinc-200">{peca.nome}</span>
                  {peca.marca && <span className="text-slate-500 dark:text-zinc-500"> · {peca.marca}</span>}
                </Celula>

                <Celula tom="suave">{peca.unidade}</Celula>

                <Celula
                  numerica
                  forte
                  mono
                  tom={peca.saldo < 0 ? 'alerta' : peca.abaixoDoMinimo ? 'atencao' : 'neutro'}
                >
                  {formatarQuantidade(peca.saldo)}
                </Celula>

                <Celula numerica tom="suave" mono>
                  {peca.controlaSaldo ? formatarQuantidade(peca.quantidadeMinima) : '—'}
                </Celula>

                <Celula>
                  {peca.controlaSaldo ? (
                    <Etiqueta tom="andamento">Controla saldo</Etiqueta>
                  ) : (
                    <Etiqueta>Compra sob demanda</Etiqueta>
                  )}
                </Celula>

                <Celula numerica>
                  <form action={acaoDefinirAtivoPeca}>
                    <input type="hidden" name="id" value={peca.id} />
                    <input type="hidden" name="ativo" value="false" />
                    <Botao variante="discreto" type="submit">
                      Remover
                    </Botao>
                  </form>
                </Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Secao>
    </>
  )
}

