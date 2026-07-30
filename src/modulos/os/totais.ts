export type ItemParaTotal = {
  tipo: 'peca' | 'servico'
  quantidade: string | number
  precoUnitarioCentavos: number
}

export type TotaisOs = {
  pecasCentavos: number
  servicosCentavos: number
  subtotalCentavos: number
  descontoCentavos: number
  totalCentavos: number
}

/** Quantidade vem do banco como texto (`numeric`); converter aqui, uma vez só. */
function totalDoItem(item: ItemParaTotal): number {
  const quantidade = Number(item.quantidade)
  return Math.round(quantidade * item.precoUnitarioCentavos)
}

export function calcularTotais(itens: ItemParaTotal[], descontoCentavos = 0): TotaisOs {
  let pecasCentavos = 0
  let servicosCentavos = 0

  for (const item of itens) {
    if (item.tipo === 'peca') pecasCentavos += totalDoItem(item)
    else servicosCentavos += totalDoItem(item)
  }

  const subtotalCentavos = pecasCentavos + servicosCentavos
  // Desconto nunca empurra o total abaixo de zero: isso viraria crédito, que
  // não existe no modelo.
  const totalCentavos = Math.max(0, subtotalCentavos - descontoCentavos)

  return {
    pecasCentavos,
    servicosCentavos,
    subtotalCentavos,
    descontoCentavos,
    totalCentavos,
  }
}
