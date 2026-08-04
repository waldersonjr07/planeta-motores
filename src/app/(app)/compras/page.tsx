import { LinkBotao } from '@/componentes/botao'
import { CabecalhoPagina, Cartao, Vazio } from '@/componentes/pagina'
import { Celula, Linha, Tabela } from '@/componentes/tabela'
import { formatarReais } from '@/lib/dinheiro'
import { listarCompras } from '@/modulos/compras/consultas'

export default async function PaginaCompras() {
  const lista = await listarCompras()

  return (
    <>
      <CabecalhoPagina
        titulo="Compras"
        descricao="Toda compra entra no estoque e atualiza o último custo da peça."
        acoes={
          <LinkBotao href="/compras/nova" variante="primario">
            Nova compra
          </LinkBotao>
        }
      />

      <Cartao>
        {lista.length === 0 ? (
          <Vazio>Nenhuma compra registrada ainda.</Vazio>
        ) : (
          <Tabela
            colunas={[
              { texto: 'Data' },
              { texto: 'Fornecedor' },
              { texto: 'OS' },
              { texto: 'Documento' },
              { texto: 'Itens', numerica: true },
              { texto: 'Total', numerica: true },
            ]}
          >
            {lista.map((compra) => (
              <Linha key={compra.id}>
                <Celula>{compra.data.split('-').reverse().join('/')}</Celula>
                <Celula>{compra.fornecedorNome ?? '—'}</Celula>
                <Celula tom="suave">{compra.osNumero ?? '—'}</Celula>
                <Celula tom="suave">{compra.numeroDocumento ?? '—'}</Celula>
                <Celula numerica>{compra.quantidadeItens}</Celula>
                <Celula numerica forte>
                  {formatarReais(compra.totalCentavos)}
                </Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Cartao>
    </>
  )
}
