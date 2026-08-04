import { Botao } from '@/componentes/botao'
import { Etiqueta } from '@/componentes/etiqueta'
import { CabecalhoPagina, Secao, Vazio } from '@/componentes/pagina'
import { Celula, Linha, Tabela } from '@/componentes/tabela'
import { formatarQuantidade } from '@/lib/quantidade'
import { acaoDefinirAtivoPeca } from '@/modulos/catalogo/acoes'
import { listarSaldos } from '@/modulos/estoque/consultas'
import { FormularioAjuste } from './ajuste-formulario'
import { FormularioPeca } from './peca-formulario'

export default async function PaginaEstoque() {
  const saldos = await listarSaldos()
  const aRepor = saldos.filter((peca) => peca.abaixoDoMinimo)

  return (
    <>
      <CabecalhoPagina
        titulo="Estoque"
        descricao="Consumível guardado na oficina controla saldo. Peça específica, comprada só quando o serviço pede, não precisa."
      />

      {aRepor.length > 0 && (
        <div className="rounded-lg border border-atencao-borda bg-atencao-fundo px-5 py-4 text-sm text-atencao">
          <p className="font-semibold">
            {aRepor.length === 1
              ? '1 peça precisa de reposição'
              : `${aRepor.length} peças precisam de reposição`}
          </p>
          <p className="mt-1">
            {aRepor
              .map((peca) => `${peca.nome} (${formatarQuantidade(peca.saldo)})`)
              .join(' · ')}
          </p>
        </div>
      )}

      <Secao titulo="Peças em estoque">
        {saldos.length === 0 ? (
          <Vazio>Nenhuma peça cadastrada. Cadastre a primeira logo abaixo.</Vazio>
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
            {saldos.map((peca) => (
              <Linha key={peca.id}>
                <Celula>
                  {peca.nome}
                  {peca.marca && <span className="text-tinta-suave"> · {peca.marca}</span>}
                </Celula>
                <Celula tom="suave">{peca.unidade}</Celula>
                <Celula
                  numerica
                  forte
                  tom={peca.saldo < 0 ? 'alerta' : peca.abaixoDoMinimo ? 'atencao' : 'neutro'}
                >
                  {formatarQuantidade(peca.saldo)}
                </Celula>
                <Celula numerica tom="suave">
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

      <Secao
        titulo="Cadastrar peça"
        descricao="A peça cadastrada aqui fica disponível no orçamento da OS e no lançamento de compra."
      >
        <FormularioPeca />
      </Secao>

      <Secao
        titulo="Ajuste de inventário"
        descricao="O saldo é a soma dos movimentos e nunca é editado direto. Para corrigir, lance um ajuste — o motivo é opcional, mas é o que explica o número lá na frente."
      >
        <FormularioAjuste
          pecas={saldos.map((peca) => ({
            id: peca.id,
            nome: peca.nome,
            unidade: peca.unidade,
            saldo: peca.saldo,
          }))}
        />
      </Secao>
    </>
  )
}
