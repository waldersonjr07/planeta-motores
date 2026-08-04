import { db } from '../../src/db'
import { clientes, equipamentos, pecas, servicos } from '../../src/db/schema'
import { criarOs } from '../../src/modulos/os/operacoes'

/** Cliente, equipamento, um serviço, uma peça e uma OS recém-recebida. */
export async function cenarioOs() {
  const [cliente] = await db.insert(clientes).values({ nome: 'Marcos Andrade' }).returning()
  const [equipamento] = await db
    .insert(equipamentos)
    .values({
      clienteId: cliente.id,
      tipoMotor: '2T',
      aplicacao: 'rocadeira',
      marca: 'Stihl',
      modelo: 'FS 220',
    })
    .returning()
  const [servico] = await db
    .insert(servicos)
    .values({ nome: 'Retífica de cilindro', precoPadraoCentavos: 21000 })
    .returning()
  // Peça não tem preço de tabela: quem lança na OS informa o valor.
  const [peca] = await db
    .insert(pecas)
    .values({ nome: 'Kit cilindro 40mm', controlaSaldo: true })
    .returning()

  const r = await criarOs({
    clienteId: cliente.id,
    equipamentoId: equipamento.id,
    problemaRelatado: 'Não pega a frio',
    acessoriosRecebidos: null,
    observacoes: null,
  })
  if (!r.ok) throw new Error('criação de OS falhou')

  return { cliente, equipamento, servico, peca, osId: r.dados.id, numero: r.dados.numero }
}
