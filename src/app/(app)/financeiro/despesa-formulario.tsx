'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao, GradeFormulario } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoRegistrarDespesa } from '@/modulos/financeiro/acoes'
import { CATEGORIAS_DESPESA } from '@/modulos/financeiro/esquemas'

export function FormularioDespesa({ hoje }: { hoje: string }) {
  const [resultado, enviar, pendente] = useActionState(acaoRegistrarDespesa, null)

  return (
    <form action={enviar} className="flex flex-col gap-3">
      <GradeFormulario>
        <Campo
          rotulo="Data"
          nome="data"
          type="date"
          defaultValue={hoje}
          className="col-span-2"
        />
        <CampoSelecao
          rotulo="Categoria"
          nome="categoria"
          className="col-span-2"
          opcoes={Object.entries(CATEGORIAS_DESPESA).map(([valor, texto]) => ({
            valor,
            texto,
          }))}
        />
        <Campo rotulo="Descrição" nome="descricao" required className="col-span-4" />
        <Campo
          rotulo="Valor"
          nome="valor"
          required
          placeholder="0,00"
          className="col-span-2"
        />
        <div className="col-span-2">
          <Botao type="submit" disabled={pendente} className="w-full">
            {pendente ? 'Lançando…' : 'Lançar despesa'}
          </Botao>
        </div>
      </GradeFormulario>

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
    </form>
  )
}
