import { Botao } from '@/componentes/botao'
import { Secao, Vazio } from '@/componentes/pagina'
import { Celula, Linha, Tabela } from '@/componentes/tabela'
import { acaoDefinirAtivoFornecedor } from '@/modulos/catalogo/acoes'
import { listarFornecedores } from '@/modulos/catalogo/fornecedores-consultas'
import { FormularioFornecedor } from './formulario'

export default async function PaginaFornecedores() {
  const lista = await listarFornecedores()

  return (
    <>
      <Secao titulo="Fornecedores">
        {lista.length === 0 ? (
          <Vazio>Nenhum fornecedor cadastrado ainda.</Vazio>
        ) : (
          <Tabela
            colunas={[
              { texto: 'Nome' },
              { texto: 'Telefone' },
              { texto: 'E-mail' },
              { texto: 'Ações', acao: true },
            ]}
          >
            {lista.map((fornecedor) => (
              <Linha key={fornecedor.id}>
                <Celula forte>{fornecedor.nome}</Celula>
                <Celula tom="suave">{fornecedor.telefone ?? '—'}</Celula>
                <Celula tom="suave">{fornecedor.email ?? '—'}</Celula>
                <Celula numerica>
                  <form action={acaoDefinirAtivoFornecedor}>
                    <input type="hidden" name="id" value={fornecedor.id} />
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

      <Secao titulo="Cadastrar fornecedor">
        <FormularioFornecedor />
      </Secao>
    </>
  )
}
