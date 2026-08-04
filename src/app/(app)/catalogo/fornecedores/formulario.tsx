'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, GradeFormulario } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoSalvarFornecedor } from '@/modulos/catalogo/acoes'

export function FormularioFornecedor() {
  const [resultado, enviar, pendente] = useActionState(acaoSalvarFornecedor, null)
  const campos = resultado && !resultado.ok ? (resultado.campos ?? {}) : {}

  return (
    <form action={enviar} className="flex flex-col gap-3">
      <GradeFormulario>
        <Campo rotulo="Nome" nome="nome" required className="col-span-4" erro={campos.nome} />
        <Campo
          rotulo="Telefone"
          nome="telefone"
          className="col-span-3"
          erro={campos.telefone}
        />
        <Campo rotulo="E-mail" nome="email" className="col-span-3" />
        <div className="col-span-2">
          <Botao type="submit" disabled={pendente} className="w-full">
            {pendente ? 'Salvando…' : 'Adicionar fornecedor'}
          </Botao>
        </div>
        <Campo rotulo="Observações" nome="observacoes" className="col-span-12" />
      </GradeFormulario>

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
    </form>
  )
}
