import { renderToBuffer } from '@react-pdf/renderer'
import { formatarData } from '@/lib/datas'
import { formatarReais } from '@/lib/dinheiro'
import { obterConfiguracoes } from '@/modulos/configuracoes/consultas'
import { resumoDeCobrancaDaOs } from '@/modulos/financeiro/consultas'
import { obterOs, type OsCompleta } from '@/modulos/os/consultas'
import {
  Cabecalho,
  Campo,
  Document,
  Page,
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

function Comprovante({ os, empresa }: { os: OsCompleta; empresa: DadosEmpresa }) {
  return (
    <Document>
      <Page size="A4" style={estilos.pagina}>
        <Cabecalho empresa={empresa} titulo={`Comprovante de recebimento — OS ${os.numero}`} />

        <View style={estilos.bloco}>
          <Campo rotulo="Cliente" valor={os.cliente.nome} />
          <Campo rotulo="Equipamento" valor={os.equipamento.descricao} />
          {os.equipamento.numeroSerie ? (
            <Campo rotulo="Número de série" valor={os.equipamento.numeroSerie} />
          ) : null}
          <Campo rotulo="Recebido em" valor={formatarData(os.recebidoEm)} />
        </View>

        <View style={estilos.bloco}>
          <Text style={estilos.titulo}>Problema relatado</Text>
          <Text>{os.problemaRelatado ?? 'Não informado.'}</Text>
        </View>

        <View style={estilos.bloco}>
          <Text style={estilos.titulo}>Acessórios recebidos</Text>
          <Text>{os.acessoriosRecebidos ?? 'Nenhum.'}</Text>
        </View>

        <Text style={estilos.rodape}>
          Este comprovante atesta apenas o recebimento do equipamento. O orçamento é enviado
          depois do diagnóstico e o serviço só começa após a aprovação do cliente.
        </Text>

        <View style={estilos.assinatura}>
          <Text>Assinatura do cliente</Text>
        </View>
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

  return (
    <Document>
      <Page size="A4" style={estilos.pagina}>
        <Cabecalho empresa={empresa} titulo={`Orçamento — OS ${os.numero}`} />

        <View style={estilos.bloco}>
          <Campo rotulo="Cliente" valor={os.cliente.nome} />
          <Campo rotulo="Equipamento" valor={os.equipamento.descricao} />
          <Campo rotulo="Data" valor={formatarData(os.orcadoEm ?? new Date())} />
          <Campo rotulo="Validade" valor={`${validadeDias} dias`} />
        </View>

        {os.diagnostico ? (
          <View style={estilos.bloco}>
            <Text style={estilos.titulo}>Diagnóstico</Text>
            <Text>{os.diagnostico}</Text>
          </View>
        ) : null}

        <TabelaDeItens titulo="Peças" itens={pecas} />
        <TabelaDeItens titulo="Serviços" itens={servicos} />

        <View style={estilos.totais}>
          <View style={estilos.linha}>
            <Text style={estilos.rotulo}>Peças</Text>
            <Text>{formatarReais(os.totais.pecasCentavos)}</Text>
          </View>
          <View style={estilos.linha}>
            <Text style={estilos.rotulo}>Serviços</Text>
            <Text>{formatarReais(os.totais.servicosCentavos)}</Text>
          </View>
          {os.totais.descontoCentavos > 0 ? (
            <View style={estilos.linha}>
              <Text style={estilos.rotulo}>Desconto</Text>
              <Text>-{formatarReais(os.totais.descontoCentavos)}</Text>
            </View>
          ) : null}
          <View style={estilos.total}>
            <Text>Total</Text>
            <Text>{formatarReais(os.totais.totalCentavos)}</Text>
          </View>
        </View>

        <Text style={estilos.rodape}>
          Orçamento sujeito a revisão caso o desmonte revele defeito não visível no
          diagnóstico. Qualquer alteração é comunicada antes da execução.
        </Text>
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
  return (
    <Document>
      <Page size="A4" style={estilos.pagina}>
        <Cabecalho empresa={empresa} titulo={`Recibo — OS ${os.numero}`} />

        <View style={estilos.bloco}>
          <Campo rotulo="Cliente" valor={os.cliente.nome} />
          <Campo rotulo="Equipamento" valor={os.equipamento.descricao} />
          <Campo rotulo="Data" valor={formatarData(new Date())} />
        </View>

        <View style={estilos.bloco}>
          <Text style={estilos.titulo}>Pagamentos recebidos</Text>
          <View style={estilos.linha}>
            <Text style={estilos.rotulo}>Total do serviço</Text>
            <Text>{formatarReais(os.totais.totalCentavos)}</Text>
          </View>
          <View style={estilos.linha}>
            <Text style={estilos.rotulo}>Valor pago</Text>
            <Text>{formatarReais(pagoCentavos)}</Text>
          </View>
          <View style={estilos.total}>
            <Text>{saldoCentavos > 0 ? 'Saldo em aberto' : 'Saldo'}</Text>
            <Text>{formatarReais(saldoCentavos)}</Text>
          </View>
        </View>

        <Text style={estilos.rodape}>
          {saldoCentavos > 0
            ? 'Recibo parcial: consta saldo em aberto referente a esta ordem de serviço.'
            : 'Recebemos o valor acima, dando plena quitação desta ordem de serviço.'}
        </Text>

        <View style={estilos.assinatura}>
          <Text>{empresa.empresaNome}</Text>
        </View>
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
      <Orcamento os={os} empresa={empresa} validadeDias={configuracoes.orcamentoValidadeDias} />
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
