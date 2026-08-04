'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, GradeFormulario } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoSalvarServico } from '@/modulos/catalogo/acoes'

export function FormularioServico() {
  const [resultado, enviar, pendente] = useActionState(acaoSalvarServico, null)
  const campos = resultado && !resultado.ok ? (resultado.campos ?? {}) : {}

  return (
    <form action={enviar} className="flex flex-col gap-3">
      <GradeFormulario>
        <Campo
          rotulo="Nome do serviço"
          nome="nome"
          required
          className="col-span-4"
          erro={campos.nome}
        />
        <Campo
          rotulo="Preço padrão"
          nome="precoPadrao"
          placeholder="0,00"
          className="col-span-2"
          erro={campos.precoPadrao}
        />
        <Campo rotulo="Descrição" nome="descricao" className="col-span-4" />
        <div className="col-span-2">
          <Botao type="submit" disabled={pendente} className="w-full">
            {pendente ? 'Salvando…' : 'Adicionar serviço'}
          </Botao>
        </div>
      </GradeFormulario>

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
    </form>
  )
}
