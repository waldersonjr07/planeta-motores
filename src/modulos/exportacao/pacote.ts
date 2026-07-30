import { db } from '@/db'
import {
  clientes,
  compraItens,
  compras,
  despesas,
  equipamentos,
  estoqueMovimentos,
  fornecedores,
  ordensServico,
  osItens,
  pagamentos,
  pecas,
  servicos,
} from '@/db/schema'
import { paraCsv } from './csv'

export type ArquivoExportado = { nome: string; conteudo: string }

/**
 * Um CSV por tabela de domínio. Não inclui usuários nem sessões: hash de senha
 * não tem por que sair da máquina.
 */
export async function gerarExportacao(): Promise<ArquivoExportado[]> {
  const tabelas = {
    clientes,
    equipamentos,
    servicos,
    pecas,
    fornecedores,
    'ordens-servico': ordensServico,
    'os-itens': osItens,
    pagamentos,
    despesas,
    compras,
    'compra-itens': compraItens,
    'estoque-movimentos': estoqueMovimentos,
  } as const

  const arquivos: ArquivoExportado[] = []

  for (const [nome, tabela] of Object.entries(tabelas)) {
    const linhas = (await db.select().from(tabela)) as Record<string, unknown>[]
    arquivos.push({ nome: `${nome}.csv`, conteudo: paraCsv(linhas) })
  }

  return arquivos
}
