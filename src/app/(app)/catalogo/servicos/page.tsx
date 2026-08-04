import { Botao } from '@/componentes/botao'
import { Secao, Vazio } from '@/componentes/pagina'
import { Celula, Linha, Tabela } from '@/componentes/tabela'
import { formatarReais } from '@/lib/dinheiro'
import { acaoDefinirAtivoServico } from '@/modulos/catalogo/acoes'
import { listarServicos } from '@/modulos/catalogo/servicos-consultas'
import { FormularioServico } from './formulario'

export default async function PaginaServicos() {
  const lista = await listarServicos()

  return (
    <>
      <Secao titulo="Serviços">
        {lista.length === 0 ? (
          <Vazio>Nenhum serviço cadastrado ainda.</Vazio>
        ) : (
          <Tabela
            colunas={[
              { texto: 'Serviço' },
              { texto: 'Descrição' },
              { texto: 'Preço padrão', numerica: true },
              { texto: 'Ações', acao: true },
            ]}
          >
            {lista.map((servico) => (
              <Linha key={servico.id}>
                <Celula forte>{servico.nome}</Celula>
                <Celula tom="suave">{servico.descricao ?? '—'}</Celula>
                <Celula numerica>{formatarReais(servico.precoPadraoCentavos)}</Celula>
                <Celula numerica>
                  <form action={acaoDefinirAtivoServico}>
                    <input type="hidden" name="id" value={servico.id} />
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

      <Secao titulo="Cadastrar serviço">
        <FormularioServico />
      </Secao>
    </>
  )
}
