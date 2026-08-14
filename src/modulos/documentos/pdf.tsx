import { renderToBuffer } from '@react-pdf/renderer'
import { formatarData } from '@/lib/datas'
import { formatarReais } from '@/lib/dinheiro'
import { valorPorExtenso } from '@/lib/extenso'
import { mascararTelefone } from '@/lib/mascaras'
import { obterConfiguracoes } from '@/modulos/configuracoes/consultas'
import { resumoDeCobrancaDaOs } from '@/modulos/financeiro/consultas'
import { obterOs, type OsCompleta } from '@/modulos/os/consultas'
import {
  Assinaturas,
  Bloco,
  Cabecalho,
  CabecalhoCompacto,
  CaixaDeTotais,
  Campo,
  Condicoes,
  Document,
  FaixaDocumento,
  Page,
  Rodape,
  TabelaDeItens,
  Text,
  View,
  estilos,
  type DadosEmpresa,
} from './componentes'

export type TipoDocumento = 'comprovante' | 'orcamento' | 'recibo'

export const TIPOS: Record<TipoDocumento, string> = {
  comprovante: 'Comprovante de recebimento',
  orcamento: 'Orçamento',
  recibo: 'Recibo de pagamento',
}

function BlocoCliente({ os }: { os: OsCompleta }) {
  return (
    <Bloco rotulo="Dados do cliente">
      <Campo rotulo="Nome" valor={os.cliente.nome} />
      {os.cliente.telefone ? (
        <Campo rotulo="Telefone" valor={mascararTelefone(os.cliente.telefone)} />
      ) : null}
    </Bloco>
  )
}

function BlocoEquipamento({ os }: { os: OsCompleta }) {
  return (
    <Bloco rotulo="Equipamento">
      <Campo rotulo="Descrição" valor={os.equipamento.descricao} />
      {os.equipamento.numeroSerie ? (
        <Campo rotulo="Número de série" valor={os.equipamento.numeroSerie} />
      ) : null}
    </Bloco>
  )
}

function Comprovante({ os, empresa }: { os: OsCompleta; empresa: DadosEmpresa }) {
  const documento = `Comprovante ${os.numero}`

  return (
    <Document>
      <Page size="A4" style={estilos.pagina}>
        <CabecalhoCompacto empresa={empresa} documento={documento} />
        <Cabecalho empresa={empresa} />
        <FaixaDocumento
          titulo="Comprovante de recebimento"
          numero={os.numero}
          emissao={os.recebidoEm}
        />

        <BlocoCliente os={os} />
        <BlocoEquipamento os={os} />

        <Bloco rotulo="Problema relatado">
          <Text>{os.problemaRelatado ?? 'Não informado.'}</Text>
        </Bloco>

        <Bloco rotulo="Acessórios recebidos">
          <Text>{os.acessoriosRecebidos ?? 'Nenhum.'}</Text>
        </Bloco>

        <Condicoes>
          Este comprovante atesta apenas o recebimento do equipamento. O orçamento é
          enviado depois do diagnóstico e o serviço só começa após a aprovação do
          cliente.
        </Condicoes>

        <Assinaturas
          cliente={os.cliente.nome}
          documento={os.cliente.documento ?? null}
          empresaNome={empresa.empresaNome}
        />

        <Rodape empresa={empresa} />
      </Page>
    </Document>
  )
}

function Orcamento({
  os,
  empresa,
  validadeDias,
}: {
  os: OsCompleta
  empresa: DadosEmpresa
  validadeDias: number
}) {
  const pecas = os.itens.filter((item) => item.tipo === 'peca')
  const servicos = os.itens.filter((item) => item.tipo === 'servico')
  const documento = `Orçamento ${os.numero}`

  const linhas = [
    { rotulo: 'Peças', valor: formatarReais(os.totais.pecasCentavos) },
    { rotulo: 'Serviços', valor: formatarReais(os.totais.servicosCentavos) },
  ]
  if (os.totais.descontoCentavos > 0) {
    linhas.push({
      rotulo: 'Desconto',
      valor: `-${formatarReais(os.totais.descontoCentavos)}`,
    })
  }

  return (
    <Document>
      <Page size="A4" style={estilos.pagina}>
        <CabecalhoCompacto empresa={empresa} documento={documento} />
        <Cabecalho empresa={empresa} />
        <FaixaDocumento
          titulo="Orçamento"
          numero={os.numero}
          emissao={os.orcadoEm ?? new Date()}
          validadeDias={validadeDias}
        />

        <BlocoCliente os={os} />
        <BlocoEquipamento os={os} />

        {os.diagnostico ? (
          <Bloco rotulo="Diagnóstico">
            <Text>{os.diagnostico}</Text>
          </Bloco>
        ) : null}

        <TabelaDeItens titulo="Peças" itens={pecas} />
        <TabelaDeItens titulo="Serviços" itens={servicos} />

        <CaixaDeTotais linhas={linhas} total={os.totais.totalCentavos} />

        <Condicoes>
          Orçamento sujeito a revisão caso o desmonte revele defeito não visível no
          diagnóstico. Qualquer alteração é comunicada antes da execução. Validade de{' '}
          {validadeDias} dias a contar da emissão.
        </Condicoes>

        <View style={{ marginTop: 12 }}>
          <Text style={estilos.titulo}>DE ACORDO — ASSINATURA E DATA</Text>
        </View>

        <Assinaturas
          cliente={os.cliente.nome}
          documento={os.cliente.documento ?? null}
          empresaNome={empresa.empresaNome}
        />

        <Rodape empresa={empresa} />
      </Page>
    </Document>
  )
}

function Recibo({
  os,
  empresa,
  pagoCentavos,
  saldoCentavos,
}: {
  os: OsCompleta
  empresa: DadosEmpresa
  pagoCentavos: number
  saldoCentavos: number
}) {
  const documento = `Recibo ${os.numero}`

  const linhas = [
    { rotulo: 'Total do serviço', valor: formatarReais(os.totais.totalCentavos) },
  ]
  if (saldoCentavos > 0) {
    linhas.push({ rotulo: 'Saldo em aberto', valor: formatarReais(saldoCentavos) })
  }

  return (
    <Document>
      <Page size="A4" style={estilos.pagina}>
        <CabecalhoCompacto empresa={empresa} documento={documento} />
        <Cabecalho empresa={empresa} />
        <FaixaDocumento titulo="Recibo" numero={os.numero} emissao={new Date()} />

        <BlocoCliente os={os} />
        <BlocoEquipamento os={os} />

        <CaixaDeTotais linhas={linhas} total={pagoCentavos} rotuloTotal="VALOR PAGO" />

        {/* Valor por extenso: costume de recibo no Brasil. */}
        <Bloco rotulo="Valor recebido por extenso">
          <Text>{valorPorExtenso(pagoCentavos)}.</Text>
        </Bloco>

        <Condicoes>
          {saldoCentavos > 0
            ? `Recibo parcial: consta saldo em aberto de ${formatarReais(saldoCentavos)} referente a esta ordem de serviço.`
            : 'Recebemos o valor acima, dando plena quitação desta ordem de serviço.'}
        </Condicoes>

        <Assinaturas
          cliente={os.cliente.nome}
          documento={os.cliente.documento ?? null}
          empresaNome={empresa.empresaNome}
        />

        <Rodape empresa={empresa} />
      </Page>
    </Document>
  )
}

/** Gera o PDF pedido. `null` quando a OS não existe. */
export async function gerarDocumento(
  tipo: TipoDocumento,
  osId: string,
): Promise<{ conteudo: Buffer; nomeArquivo: string } | null> {
  const os = await obterOs(osId)
  if (!os) return null

  const configuracoes = await obterConfiguracoes()
  const empresa: DadosEmpresa = {
    empresaNome: configuracoes.empresaNome,
    empresaCnpj: configuracoes.empresaCnpj,
    empresaTelefone: configuracoes.empresaTelefone,
    empresaEndereco: configuracoes.empresaEndereco,
  }

  let documento
  if (tipo === 'comprovante') {
    documento = <Comprovante os={os} empresa={empresa} />
  } else if (tipo === 'orcamento') {
    documento = (
      <Orcamento
        os={os}
        empresa={empresa}
        validadeDias={configuracoes.orcamentoValidadeDias}
      />
    )
  } else {
    const cobranca = await resumoDeCobrancaDaOs(osId)
    documento = (
      <Recibo
        os={os}
        empresa={empresa}
        pagoCentavos={cobranca.pagoCentavos}
        saldoCentavos={cobranca.saldoCentavos}
      />
    )
  }

  return {
    conteudo: await renderToBuffer(documento),
    nomeArquivo: `${tipo}-${os.numero}.pdf`,
  }
}
