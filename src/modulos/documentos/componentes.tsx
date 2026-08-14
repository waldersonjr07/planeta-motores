import fs from 'node:fs'
import path from 'node:path'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { formatarData } from '@/lib/datas'
import { formatarReais } from '@/lib/dinheiro'
import { mascararDocumento, mascararTelefone } from '@/lib/mascaras'
import { formatarQuantidade } from '@/lib/quantidade'

/**
 * Lido do disco como Buffer, não como caminho de string: `@react-pdf/renderer`
 * resolve `src` de texto com o `url.parse` do Node, que em Windows confunde a
 * letra da unidade ("C:\...") com um protocolo de URL e tenta buscar a imagem
 * pela rede em vez de ler o arquivo local — falha calada, sem emblema no PDF
 * e sem erro no `renderToBuffer`. Um Buffer pula esse caminho inteiro.
 */
const CAMINHO_EMBLEMA = path.join(process.cwd(), 'public', 'logo-planeta-motores.jpeg')
const EMBLEMA = fs.readFileSync(CAMINHO_EMBLEMA)

/*
 * Cores tiradas de src/app/globals.css, para papel e tela combinarem. O
 * marinho é o campo do emblema; o teal vem dos continentes do planeta e
 * aparece uma vez só, no filete acima do total.
 */
const MARINHO = '#16283f'
const REALCE = '#eef1f5'
const TEAL = '#5fb3b8'
const TINTA_SUAVE = '#5b6976'
const BORDA = '#dde2e8'

export const estilos = StyleSheet.create({
  pagina: {
    paddingTop: 34,
    paddingBottom: 46,
    paddingHorizontal: 40,
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    color: '#16202a',
  },

  cabecalho: { alignItems: 'center', marginBottom: 4 },
  emblema: { width: 56, height: 56, borderRadius: 28, marginBottom: 6 },
  empresa: { fontSize: 15, fontFamily: 'Helvetica-Bold', letterSpacing: 1.6, color: MARINHO },
  lema: { fontSize: 8.5, color: TINTA_SUAVE, letterSpacing: 0.6, marginTop: 1 },
  contato: { fontSize: 8.5, color: TINTA_SUAVE, marginTop: 3 },
  regua: { height: 2, backgroundColor: MARINHO, marginTop: 8, marginBottom: 14 },

  /*
   * Só o posicionamento fica aqui. A borda mora em `compactoConteudo`, dentro
   * do `render`: um `View` fixo carrega seu `style` para toda página mesmo
   * quando `render` devolve null, e essa borda sozinha já é um traço visível
   * — pouco, mas visível — no topo da primeira página.
   */
  compacto: {
    position: 'absolute',
    top: 14,
    left: 40,
    right: 40,
  },
  compactoConteudo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: TINTA_SUAVE,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDA,
    paddingBottom: 4,
  },

  faixa: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  tituloDocumento: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: MARINHO },
  faixaDireita: { alignItems: 'flex-end' },

  bloco: {
    borderWidth: 0.5,
    borderColor: BORDA,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 5,
    marginBottom: 10,
  },
  rotuloBloco: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.8,
    color: MARINHO,
    marginBottom: 4,
  },

  linha: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2.5 },
  rotulo: { color: TINTA_SUAVE },

  titulo: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: MARINHO, marginBottom: 5, letterSpacing: 0.6 },

  tabelaCabecalho: {
    flexDirection: 'row',
    backgroundColor: REALCE,
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: MARINHO,
    letterSpacing: 0.4,
  },
  tabelaLinha: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: BORDA,
    paddingVertical: 3.5,
    paddingHorizontal: 4,
  },
  colItem: { flex: 0.5 },
  colDescricao: { flex: 4.6 },
  colUnidade: { flex: 0.7, textAlign: 'center' },
  colQuantidade: { flex: 0.9, textAlign: 'right' },
  colValor: { flex: 1.4, textAlign: 'right' },

  totais: { marginTop: 10, alignSelf: 'flex-end', width: 210 },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: TEAL,
    paddingTop: 4,
    marginTop: 4,
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: MARINHO,
  },

  condicoes: { marginTop: 16 },
  textoCondicoes: { fontSize: 8, color: TINTA_SUAVE, lineHeight: 1.4 },

  assinaturas: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 44 },
  assinatura: { width: 210, borderTopWidth: 0.75, borderTopColor: '#8b97a3', paddingTop: 4 },
  nomeAssinatura: { fontSize: 8.5 },
  papelAssinatura: { fontSize: 7.5, color: TINTA_SUAVE, marginTop: 1 },

  rodape: {
    position: 'absolute',
    bottom: 22,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: BORDA,
    paddingTop: 5,
    fontSize: 7.5,
    color: TINTA_SUAVE,
  },
})

export type DadosEmpresa = {
  empresaNome: string
  empresaCnpj: string | null
  empresaTelefone: string | null
  empresaEndereco: string | null
}

function linhaDeContato(empresa: DadosEmpresa): string {
  return [
    empresa.empresaCnpj && `CNPJ ${mascararDocumento(empresa.empresaCnpj)}`,
    empresa.empresaTelefone && mascararTelefone(empresa.empresaTelefone),
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Cabeçalho grande, só na primeira página. */
export function Cabecalho({ empresa }: { empresa: DadosEmpresa }) {
  const contato = linhaDeContato(empresa)

  return (
    <View style={estilos.cabecalho}>
      {/*
        O emblema no papel que o cliente leva embora. Recortado em círculo,
        como na tela — o arquivo é quadrado com o campo marinho embutido.
      */}
      <Image src={EMBLEMA} style={estilos.emblema} />
      <Text style={estilos.empresa}>{empresa.empresaNome.toUpperCase()}</Text>
      <Text style={estilos.lema}>Atendimento Especializado</Text>
      {contato ? <Text style={estilos.contato}>{contato}</Text> : null}
      {empresa.empresaEndereco ? (
        <Text style={estilos.contato}>{empresa.empresaEndereco}</Text>
      ) : null}
      <View style={estilos.regua} />
    </View>
  )
}

/**
 * Faixa repetida da segunda página em diante. Só texto: o `render` é avaliado
 * a cada página durante a diagramação, e uma imagem ali seria remedida toda
 * vez. O cabeçalho grande só faz sentido uma vez, senão empurraria a tabela.
 */
export function CabecalhoCompacto({
  empresa,
  documento,
}: {
  empresa: DadosEmpresa
  documento: string
}) {
  return (
    <View
      fixed
      style={estilos.compacto}
      render={({ pageNumber }) =>
        pageNumber === 1 ? null : (
          <View style={estilos.compactoConteudo}>
            <Text>{empresa.empresaNome.toUpperCase()}</Text>
            <Text>{documento}</Text>
          </View>
        )
      }
    />
  )
}

export function FaixaDocumento({
  titulo,
  numero,
  emissao,
  validadeDias,
}: {
  titulo: string
  numero: string
  emissao: Date | string
  validadeDias?: number
}) {
  return (
    <View style={estilos.faixa}>
      <Text style={estilos.tituloDocumento}>
        {titulo.toUpperCase()} Nº {numero}
      </Text>
      <View style={estilos.faixaDireita}>
        <Text>Emissão {formatarData(typeof emissao === 'string' ? new Date(emissao) : emissao)}</Text>
        {validadeDias !== undefined ? (
          <Text style={estilos.rotulo}>Validade {validadeDias} dias</Text>
        ) : null}
      </View>
    </View>
  )
}

export function Bloco({
  rotulo,
  children,
}: {
  rotulo: string
  children: React.ReactNode
}) {
  return (
    <View style={estilos.bloco}>
      <Text style={estilos.rotuloBloco}>{rotulo.toUpperCase()}</Text>
      {children}
    </View>
  )
}

export function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={estilos.linha}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text>{valor}</Text>
    </View>
  )
}

/**
 * `unidade` é obrigatória de propósito. Como campo opcional com "un" por
 * omissão, a coluna UN imprimia "un" para todo item — meio litro de óleo saía
 * como "0,500 un" no papel — e o compilador não tinha como acusar o produtor
 * que esqueceu de preencher.
 */
export type ItemDoDocumento = {
  tipo: 'peca' | 'servico'
  descricao: string
  quantidade: string
  precoUnitarioCentavos: number
  unidade: string
}

export function TabelaDeItens({
  titulo,
  itens,
}: {
  titulo: string
  itens: ItemDoDocumento[]
}) {
  if (itens.length === 0) return null

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={estilos.titulo}>{titulo.toUpperCase()}</Text>

      <View style={estilos.tabelaCabecalho} fixed>
        <Text style={estilos.colItem}>IT</Text>
        <Text style={estilos.colDescricao}>DESCRIÇÃO</Text>
        <Text style={estilos.colUnidade}>UN</Text>
        <Text style={estilos.colQuantidade}>QTD</Text>
        <Text style={estilos.colValor}>V. UNIT.</Text>
        <Text style={estilos.colValor}>TOTAL</Text>
      </View>

      {itens.map((item, indice) => (
        <View
          key={indice}
          style={[
            estilos.tabelaLinha,
            // Zebra sutil: ajuda a seguir a linha até a coluna de valor.
            indice % 2 === 1 ? { backgroundColor: '#fafbfc' } : {},
          ]}
          wrap={false}
        >
          <Text style={estilos.colItem}>{String(indice + 1).padStart(2, '0')}</Text>
          <Text style={estilos.colDescricao}>{item.descricao}</Text>
          <Text style={estilos.colUnidade}>{item.unidade}</Text>
          <Text style={estilos.colQuantidade}>{formatarQuantidade(item.quantidade)}</Text>
          <Text style={estilos.colValor}>{formatarReais(item.precoUnitarioCentavos)}</Text>
          <Text style={estilos.colValor}>
            {formatarReais(
              Math.round(Number(item.quantidade) * item.precoUnitarioCentavos),
            )}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function CaixaDeTotais({
  linhas,
  total,
}: {
  linhas: { rotulo: string; valor: string }[]
  total: number
}) {
  return (
    <View style={estilos.totais}>
      {linhas.map((linha) => (
        <View key={linha.rotulo} style={estilos.linha}>
          <Text style={estilos.rotulo}>{linha.rotulo}</Text>
          <Text>{linha.valor}</Text>
        </View>
      ))}
      <View style={estilos.total}>
        <Text>TOTAL</Text>
        <Text>{formatarReais(total)}</Text>
      </View>
    </View>
  )
}

export function Condicoes({ children }: { children: React.ReactNode }) {
  return (
    <View style={estilos.condicoes}>
      <Text style={estilos.titulo}>CONDIÇÕES</Text>
      <Text style={estilos.textoCondicoes}>{children}</Text>
    </View>
  )
}

export function Assinaturas({
  cliente,
  documento,
  empresaNome,
}: {
  cliente: string
  documento: string | null
  empresaNome: string
}) {
  return (
    <View style={estilos.assinaturas}>
      <View style={estilos.assinatura}>
        <Text style={estilos.nomeAssinatura}>{cliente}</Text>
        <Text style={estilos.papelAssinatura}>
          {documento ? `CPF/CNPJ ${mascararDocumento(documento)}` : 'Cliente'}
        </Text>
      </View>
      <View style={estilos.assinatura}>
        <Text style={estilos.nomeAssinatura}>{empresaNome}</Text>
        <Text style={estilos.papelAssinatura}>Responsável técnico</Text>
      </View>
    </View>
  )
}

export function Rodape({ empresa }: { empresa: DadosEmpresa }) {
  const contato = linhaDeContato(empresa)

  return (
    <View style={estilos.rodape} fixed>
      <Text>{[empresa.empresaNome, contato].filter(Boolean).join(' · ')}</Text>
      <Text
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
    </View>
  )
}

export { Document, Image, Page, Text, View, formatarData, formatarReais }
