'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao, GradeFormulario } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoCriarEquipamento } from '@/modulos/clientes/acoes'
import { APLICACOES } from '@/modulos/clientes/equipamentos-descricao'

export function FormularioEquipamento({ clienteId }: { clienteId: string }) {
  const [resultado, enviar, pendente] = useActionState(acaoCriarEquipamento, null)
  const [aplicacaoOutro, setAplicacaoOutro] = useState(false)
  const campos = resultado && !resultado.ok ? (resultado.campos ?? {}) : {}

  return (
    <form action={enviar} className="flex flex-col gap-3">
      <input type="hidden" name="clienteId" value={clienteId} />

      <GradeFormulario>
        <CampoSelecao
          rotulo="Aplicação"
          nome="aplicacao"
          className="col-span-3"
          onChange={(evento) => setAplicacaoOutro(evento.target.value === 'outro')}
          opcoes={Object.entries(APLICACOES).map(([valor, texto]) => ({ valor, texto }))}
        />

        {aplicacaoOutro && (
          <Campo
            rotulo="Qual máquina?"
            nome="aplicacaoOutra"
            required
            className="col-span-4"
            placeholder="Cortador de grama, compactador…"
            erro={campos.aplicacaoOutra}
          />
        )}
        <CampoSelecao
          rotulo="Motor"
          nome="tipoMotor"
          className="col-span-2"
          opcoes={[
            { valor: '2T', texto: '2 tempos' },
            { valor: '4T', texto: '4 tempos' },
          ]}
        />
        <Campo rotulo="Marca" nome="marca" className="col-span-2" />
        <Campo rotulo="Modelo" nome="modelo" className="col-span-2" />
        <Campo rotulo="Número de série" nome="numeroSerie" className="col-span-3" />

        <div className="col-span-4">
          <Botao type="submit" disabled={pendente} className="w-full">
            {pendente ? 'Adicionando…' : 'Adicionar equipamento'}
          </Botao>
        </div>
      </GradeFormulario>

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
    </form>
  )
}
