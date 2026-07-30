'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoTexto } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoSalvarConfiguracoes } from '@/modulos/configuracoes/acoes'

type Valores = {
  empresaNome: string
  empresaCnpj: string | null
  empresaTelefone: string | null
  empresaEndereco: string | null
  orcamentoValidadeDias: number
  modeloMsgOrcamento: string
  modeloMsgPronto: string
  modeloMsgCobranca: string
}

export function FormularioConfiguracoes({ valores }: { valores: Valores }) {
  const [resultado, enviar, pendente] = useActionState(acaoSalvarConfiguracoes, null)
  const campos = resultado && !resultado.ok ? (resultado.campos ?? {}) : {}

  return (
    <form action={enviar} className="flex max-w-2xl flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Campo
          rotulo="Nome da empresa"
          nome="empresaNome"
          required
          defaultValue={valores.empresaNome}
          erro={campos.empresaNome}
        />
        <Campo
          rotulo="CNPJ"
          nome="empresaCnpj"
          defaultValue={valores.empresaCnpj ?? ''}
          erro={campos.empresaCnpj}
        />
        <Campo
          rotulo="Telefone"
          nome="empresaTelefone"
          defaultValue={valores.empresaTelefone ?? ''}
          erro={campos.empresaTelefone}
        />
        <Campo
          rotulo="Validade do orçamento (dias)"
          nome="orcamentoValidadeDias"
          type="number"
          min={1}
          defaultValue={valores.orcamentoValidadeDias}
          erro={campos.orcamentoValidadeDias}
        />
      </div>

      <CampoTexto
        rotulo="Endereço"
        nome="empresaEndereco"
        defaultValue={valores.empresaEndereco ?? ''}
      />

      <p className="text-xs text-gray-600">
        Nas mensagens você pode usar <code>{'{{cliente}}'}</code>, <code>{'{{numero}}'}</code>,{' '}
        <code>{'{{equipamento}}'}</code>, <code>{'{{total}}'}</code> e{' '}
        <code>{'{{saldo}}'}</code>.
      </p>

      <CampoTexto
        rotulo="Mensagem de orçamento"
        nome="modeloMsgOrcamento"
        defaultValue={valores.modeloMsgOrcamento}
        erro={campos.modeloMsgOrcamento}
      />
      <CampoTexto
        rotulo="Mensagem de serviço pronto"
        nome="modeloMsgPronto"
        defaultValue={valores.modeloMsgPronto}
        erro={campos.modeloMsgPronto}
      />
      <CampoTexto
        rotulo="Mensagem de cobrança"
        nome="modeloMsgCobranca"
        defaultValue={valores.modeloMsgCobranca}
        erro={campos.modeloMsgCobranca}
      />

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
      {resultado?.ok && <p className="text-sm text-green-700">Configurações salvas.</p>}

      <Botao type="submit" disabled={pendente} className="self-start">
        {pendente ? 'Salvando…' : 'Salvar'}
      </Botao>
    </form>
  )
}
