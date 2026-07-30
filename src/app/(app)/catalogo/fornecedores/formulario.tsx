'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoSalvarFornecedor } from '@/modulos/catalogo/acoes'

export function FormularioFornecedor() {
  const [resultado, enviar, pendente] = useActionState(acaoSalvarFornecedor, null)
  const campos = resultado && !resultado.ok ? (resultado.campos ?? {}) : {}

  return (
    <form
      action={enviar}
      className="flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4"
    >
      <Campo rotulo="Nome" nome="nome" required erro={campos.nome} />
      <Campo rotulo="Telefone" nome="telefone" erro={campos.telefone} />
      <Campo rotulo="E-mail" nome="email" />
      <Campo rotulo="Observações" nome="observacoes" />
      <Botao type="submit" disabled={pendente}>
        {pendente ? 'Salvando…' : 'Adicionar fornecedor'}
      </Botao>
      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
    </form>
  )
}
