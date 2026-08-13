import { CabecalhoPagina, Cartao } from '@/componentes/pagina'
import { Voltar } from '@/componentes/voltar'
import { listarFornecedores } from '@/modulos/catalogo/fornecedores-consultas'
import { listarPecas } from '@/modulos/catalogo/pecas-consultas'
import { hoje } from '@/lib/periodo'
import { listarOs } from '@/modulos/os/consultas'
import { FormularioCompra } from './formulario'

export default async function PaginaNovaCompra() {
  const [pecas, fornecedores, ordens] = await Promise.all([
    listarPecas(),
    listarFornecedores(),
    listarOs({ situacoes: ['aprovado', 'aguardando_peca', 'em_execucao'] }),
  ])

  return (
    <>
      <div className="flex justify-end">
        <Voltar href="/compras" texto="Voltar para compras" />
      </div>

      <CabecalhoPagina
        titulo="Nova compra"
        descricao="Vincule a uma OS quando a peça foi comprada para um serviço específico."
      />

      <Cartao>
        <FormularioCompra
          hoje={hoje()}
          pecas={pecas.map((p) => ({
            id: p.id,
            texto: `${p.nome}${p.marca ? ` ${p.marca}` : ''} (${p.unidade})`,
            // O texto exibido traz marca e unidade; quem digita escreve só o
            // nome. Sem a chave, digitar "Óleo 2 tempos" não casaria com
            // "Óleo 2 tempos Ipiranga (L)" e proporia cadastrar outra peça.
            chave: p.nome,
          }))}
          fornecedores={fornecedores.map((f) => ({ id: f.id, texto: f.nome }))}
          ordens={ordens.map((os) => ({
            id: os.id,
            texto: `${os.numero} — ${os.clienteNome}`,
          }))}
        />
      </Cartao>
    </>
  )
}
