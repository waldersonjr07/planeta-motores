'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoSalvarServico } from '@/modulos/catalogo/acoes'

export function FormularioServico() {
  const [resultado, enviar, pendente] = useActionState(acaoSalvarServico, null)
  const campos = resultado && !resultado.ok ? (resultado.campos ?? {}) : {}

  return (
    <form
      action={enviar}
      className="flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4"
    >
      <Campo rotulo="Nome do serviço" nome="nome" required erro={campos.nome} />
      <Campo
        rotulo="Preço padrão"
        nome="precoPadrao"
        placeholder="0,00"
        erro={campos.precoPadrao}
      />
      <Campo rotulo="Descrição" nome="descricao" />
      <Botao type="submit" disabled={pendente}>
        {pendente ? 'Salvando…' : 'Adicionar serviço'}
      </Botao>
      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
    </form>
  )
}
