'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoSalvarPeca } from '@/modulos/catalogo/acoes'

export function FormularioPeca() {
  const [resultado, enviar, pendente] = useActionState(acaoSalvarPeca, null)
  const campos = resultado && !resultado.ok ? (resultado.campos ?? {}) : {}

  return (
    <form
      action={enviar}
      className="flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4"
    >
      <Campo rotulo="Nome da peça" nome="nome" required erro={campos.nome} />
      <Campo rotulo="Marca" nome="marca" />
      <CampoSelecao
        rotulo="Unidade"
        nome="unidade"
        opcoes={[
          { valor: 'un', texto: 'unidade' },
          { valor: 'L', texto: 'litro' },
          { valor: 'kg', texto: 'quilo' },
          { valor: 'm', texto: 'metro' },
        ]}
      />
      <Campo
        rotulo="Preço de venda"
        nome="precoVenda"
        placeholder="0,00"
        erro={campos.precoVenda}
      />
      <Campo
        rotulo="Quantidade mínima"
        nome="quantidadeMinima"
        placeholder="0"
        erro={campos.quantidadeMinima}
      />
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" name="controlaSaldo" />
        Controla saldo em estoque
      </label>
      <Botao type="submit" disabled={pendente}>
        {pendente ? 'Salvando…' : 'Cadastrar peça'}
      </Botao>
      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
      {resultado?.ok && <p className="text-sm text-green-700">Peça cadastrada.</p>}
    </form>
  )
}
