'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoCriarEquipamento } from '@/modulos/clientes/acoes'
import { APLICACOES } from '@/modulos/clientes/equipamentos-descricao'

export function FormularioEquipamento({ clienteId }: { clienteId: string }) {
  const [resultado, enviar, pendente] = useActionState(acaoCriarEquipamento, null)

  return (
    <form
      action={enviar}
      className="flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4"
    >
      <input type="hidden" name="clienteId" value={clienteId} />

      <CampoSelecao
        rotulo="Aplicação"
        nome="aplicacao"
        opcoes={Object.entries(APLICACOES).map(([valor, texto]) => ({ valor, texto }))}
      />
      <CampoSelecao
        rotulo="Motor"
        nome="tipoMotor"
        opcoes={[
          { valor: '2T', texto: '2 tempos' },
          { valor: '4T', texto: '4 tempos' },
        ]}
      />
      <Campo rotulo="Marca" nome="marca" />
      <Campo rotulo="Modelo" nome="modelo" />
      <Campo rotulo="Número de série" nome="numeroSerie" />

      <Botao type="submit" disabled={pendente}>
        {pendente ? 'Adicionando…' : 'Adicionar equipamento'}
      </Botao>

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
    </form>
  )
}
