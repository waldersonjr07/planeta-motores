'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { CampoSelecao, CampoTexto, GradeFormulario } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { Vazio } from '@/componentes/pagina'
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
      <Vazio>
        Nenhum equipamento cadastrado. Cadastre o cliente e o equipamento dele antes de
        abrir a ordem de serviço.
      </Vazio>
    )
  }

  return (
    <form action={enviar} className="flex flex-col gap-5">
      <GradeFormulario>
        <CampoSelecao
          rotulo="Cliente e equipamento"
          nome="equipamento"
          required
          className="col-span-8"
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
        </CampoSelecao>

        <CampoTexto
          rotulo="Problema relatado pelo cliente"
          nome="problemaRelatado"
          className="col-span-12"
          placeholder="Não pega a frio, perde força no corte…"
        />
        <CampoTexto
          rotulo="Acessórios recebidos"
          nome="acessoriosRecebidos"
          rows={2}
          className="col-span-6"
          placeholder="Chave, alça, protetor…"
        />
        <CampoTexto
          rotulo="Observações"
          nome="observacoes"
          rows={2}
          className="col-span-6"
        />
      </GradeFormulario>

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}

      <Botao type="submit" disabled={pendente} className="self-start">
        {pendente ? 'Abrindo…' : 'Abrir ordem de serviço'}
      </Botao>
    </form>
  )
}
