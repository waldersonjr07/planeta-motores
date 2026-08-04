import path from 'node:path'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { formatarData } from '@/lib/datas'
import { formatarReais } from '@/lib/dinheiro'
import { formatarQuantidade } from '@/lib/quantidade'

/** Lido do disco: o PDF é gerado no servidor, sem passar pelo navegador. */
const CAMINHO_EMBLEMA = path.join(process.cwd(), 'public', 'logo-planeta-motores.jpeg')

export const estilos = StyleSheet.create({
  pagina: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  cabecalho: {
    borderBottomWidth: 1,
    borderBottomColor: '#999',
    paddingBottom: 10,
    marginBottom: 16,
  },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emblema: { width: 46, height: 46, borderRadius: 23 },
  empresa: { fontSize: 14, fontFamily: 'Helvetica-Bold', letterSpacing: 1.2 },
  contato: { color: '#555', marginTop: 2 },
  titulo: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 6 },
  linha: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  rotulo: { color: '#555' },
  bloco: { marginBottom: 12 },
  tabelaCabecalho: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#999',
    paddingBottom: 3,
    marginBottom: 3,
    fontFamily: 'Helvetica-Bold',
  },
  tabelaLinha: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
    paddingVertical: 3,
  },
  colDescricao: { flex: 4 },
  colQuantidade: { flex: 1, textAlign: 'right' },
  colValor: { flex: 1.4, textAlign: 'right' },
  totais: { marginTop: 10, alignSelf: 'flex-end', width: 200 },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#999',
    paddingTop: 3,
    marginTop: 3,
    fontFamily: 'Helvetica-Bold',
  },
  rodape: { marginTop: 24, fontSize: 8, color: '#777' },
  assinatura: { marginTop: 40, borderTopWidth: 1, borderTopColor: '#999', width: 240, paddingTop: 4 },
})

export type DadosEmpresa = {
  empresaNome: string
  empresaCnpj: string | null
  empresaTelefone: string | null
  empresaEndereco: string | null
}

export function Cabecalho({ empresa, titulo }: { empresa: DadosEmpresa; titulo: string }) {
  const contato = [
    empresa.empresaCnpj && `CNPJ ${empresa.empresaCnpj}`,
    empresa.empresaTelefone,
    empresa.empresaEndereco,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <View style={estilos.cabecalho}>
      <View style={estilos.marca}>
        {/*
          O emblema no papel que o cliente leva embora. Recortado em círculo,
          como na tela — o arquivo é quadrado com o campo marinho embutido.
        */}
        <Image src={CAMINHO_EMBLEMA} style={estilos.emblema} />
        <View>
          <Text style={estilos.empresa}>{empresa.empresaNome.toUpperCase()}</Text>
          {contato ? <Text style={estilos.contato}>{contato}</Text> : null}
        </View>
      </View>
      <Text style={estilos.titulo}>{titulo}</Text>
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

export type ItemDoDocumento = {
  tipo: 'peca' | 'servico'
  descricao: string
  quantidade: string
  precoUnitarioCentavos: number
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
    <View style={estilos.bloco}>
      <Text style={estilos.titulo}>{titulo}</Text>
      <View style={estilos.tabelaCabecalho}>
        <Text style={estilos.colDescricao}>Descrição</Text>
        <Text style={estilos.colQuantidade}>Qtd</Text>
        <Text style={estilos.colValor}>Unitário</Text>
        <Text style={estilos.colValor}>Total</Text>
      </View>
      {itens.map((item, indice) => (
        <View key={indice} style={estilos.tabelaLinha}>
          <Text style={estilos.colDescricao}>{item.descricao}</Text>
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

export { Document, Image, Page, Text, View, formatarData, formatarReais }
