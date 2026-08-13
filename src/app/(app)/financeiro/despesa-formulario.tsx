'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao, GradeFormulario } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoRegistrarDespesa } from '@/modulos/financeiro/acoes'
import { CATEGORIAS_DESPESA } from '@/modulos/financeiro/esquemas'

export function FormularioDespesa({ hoje }: { hoje: string }) {
  const [resultado, enviar, pendente] = useActionState(acaoRegistrarDespesa, null)
  const [categoria, setCategoria] = useState('ferramenta')
  const ehOutros = categoria === 'outros'

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
          onChange={(evento) => setCategoria(evento.target.value)}
          opcoes={Object.entries(CATEGORIAS_DESPESA).map(([valor, texto]) => ({
            valor,
            texto,
          }))}
        />
        {ehOutros && (
          <Campo
            rotulo="Especifique (opcional)"
            nome="descricao"
            className="col-span-4"
            placeholder="Conserto do portão…"
          />
        )}
        <Campo
          rotulo="Valor"
          nome="valor"
          required
          placeholder="0,00"
          className={ehOutros ? 'col-span-2' : 'col-span-4'}
        />
        <div className={ehOutros ? 'col-span-2' : 'col-span-4'}>
          <Botao type="submit" disabled={pendente} className="w-full">
            {pendente ? 'Lançando…' : 'Lançar despesa'}
          </Botao>
        </div>
      </GradeFormulario>

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
    </form>
  )
}
