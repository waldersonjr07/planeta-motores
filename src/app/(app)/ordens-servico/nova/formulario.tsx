'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { CampoTexto } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import type { EquipamentoParaSelecao } from '@/modulos/clientes/equipamentos-consultas'
import { acaoCriarOs } from '@/modulos/os/acoes'

export function FormularioNovaOs({
  equipamentos,
}: {
  equipamentos: EquipamentoParaSelecao[]
}) {
  const [resultado, enviar, pendente] = useActionState(acaoCriarOs, null)

  // Agrupa por cliente para o <optgroup>: a Lucilene procura pelo dono do
  // motor, não pelo motor solto.
  const porCliente = new Map<string, EquipamentoParaSelecao[]>()
  for (const equipamento of equipamentos) {
    const lista = porCliente.get(equipamento.clienteNome) ?? []
    lista.push(equipamento)
    porCliente.set(equipamento.clienteNome, lista)
  }

  if (equipamentos.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        Nenhum equipamento cadastrado. Cadastre o cliente e o equipamento dele antes de
        abrir a ordem de serviço.
      </p>
    )
  }

  return (
    <form action={enviar} className="flex max-w-2xl flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700">Cliente e equipamento</span>
        <select
          name="equipamento"
          required
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Selecione…</option>
          {[...porCliente.entries()].map(([cliente, itens]) => (
            <optgroup key={cliente} label={cliente}>
              {itens.map((item) => (
                <option
                  key={item.equipamentoId}
                  value={`${item.clienteId}:${item.equipamentoId}`}
                >
                  {item.descricao}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <CampoTexto
        rotulo="Problema relatado pelo cliente"
        nome="problemaRelatado"
        placeholder="Não pega a frio, perde força no corte…"
      />
      <CampoTexto
        rotulo="Acessórios recebidos"
        nome="acessoriosRecebidos"
        placeholder="Chave, alça, protetor…"
      />
      <CampoTexto rotulo="Observações" nome="observacoes" />

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}

      <Botao type="submit" disabled={pendente} className="self-start">
        {pendente ? 'Abrindo…' : 'Abrir ordem de serviço'}
      </Botao>
    </form>
  )
}
