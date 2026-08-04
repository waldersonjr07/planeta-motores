import { LinkBotao } from '@/componentes/botao'
import { CabecalhoPagina, Secao } from '@/componentes/pagina'
import { obterConfiguracoes } from '@/modulos/configuracoes/consultas'
import { FormularioConfiguracoes } from './formulario'

export default async function PaginaConfiguracoes() {
  const valores = await obterConfiguracoes()

  return (
    <>
      <CabecalhoPagina titulo="Configurações" />

      <Secao
        titulo="Dados da empresa"
        descricao="Aparecem no cabeçalho do comprovante, do orçamento e do recibo."
      >
        <FormularioConfiguracoes valores={valores} />
      </Secao>

      <Secao
        titulo="Exportar dados"
        descricao="Um arquivo .zip com um CSV por tabela: clientes, equipamentos, ordens de serviço, itens, pagamentos, despesas, compras e movimentos de estoque."
      >
        <p className="max-w-2xl text-sm text-tinta-suave">
          Guarde uma cópia fora desta máquina. Oficina que perde a carteira de clientes não
          reabre, e os dados não devem ficar reféns de provedor nenhum.
        </p>
        <LinkBotao href="/api/exportacao" className="mt-3">
          Baixar exportação
        </LinkBotao>
      </Secao>
    </>
  )
}
