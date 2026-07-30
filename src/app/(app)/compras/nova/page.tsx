import { listarFornecedores } from '@/modulos/catalogo/fornecedores-consultas'
import { listarPecas } from '@/modulos/catalogo/pecas-consultas'
import { listarOs } from '@/modulos/os/consultas'
import { FormularioCompra } from './formulario'

/** Data de hoje no fuso de São Paulo, no formato que o input[type=date] espera. */
function hojeEmSaoPaulo(): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return partes
}

export default async function PaginaNovaCompra() {
  const [pecas, fornecedores, ordens] = await Promise.all([
    listarPecas(),
    listarFornecedores(),
    listarOs({
      situacoes: ['aprovado', 'aguardando_peca', 'em_execucao'],
    }),
  ])

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Nova compra</h1>
      <FormularioCompra
        hoje={hojeEmSaoPaulo()}
        pecas={pecas.map((p) => ({
          id: p.id,
          texto: `${p.nome}${p.marca ? ` ${p.marca}` : ''} (${p.unidade})`,
        }))}
        fornecedores={fornecedores.map((f) => ({ id: f.id, texto: f.nome }))}
        ordens={ordens.map((os) => ({
          id: os.id,
          texto: `${os.numero} — ${os.clienteNome}`,
        }))}
      />
    </section>
  )
}
