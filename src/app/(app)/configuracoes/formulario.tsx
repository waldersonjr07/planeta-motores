'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoTexto, GradeFormulario } from '@/componentes/campo'
import { CampoMascarado } from '@/componentes/campo-mascarado'
import { MensagemErro, MensagemOk } from '@/componentes/mensagem-erro'
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
    <form action={enviar} className="flex flex-col gap-6">
      <GradeFormulario>
        <Campo
          rotulo="Nome da empresa"
          nome="empresaNome"
          required
          className="col-span-5"
          defaultValue={valores.empresaNome}
          erro={campos.empresaNome}
        />
        <CampoMascarado
          rotulo="CNPJ"
          nome="empresaCnpj"
          mascara="documento"
          className="col-span-3"
          defaultValue={valores.empresaCnpj ?? ''}
          erro={campos.empresaCnpj}
        />
        <CampoMascarado
          rotulo="Telefone"
          nome="empresaTelefone"
          mascara="telefone"
          className="col-span-2"
          defaultValue={valores.empresaTelefone ?? ''}
          erro={campos.empresaTelefone}
        />
        <Campo
          rotulo="Validade do orçamento (dias)"
          nome="orcamentoValidadeDias"
          type="number"
          min={1}
          className="col-span-2"
          defaultValue={valores.orcamentoValidadeDias}
          erro={campos.orcamentoValidadeDias}
        />

        <CampoTexto
          rotulo="Endereço"
          nome="empresaEndereco"
          rows={2}
          className="col-span-12"
          defaultValue={valores.empresaEndereco ?? ''}
        />
      </GradeFormulario>

      <div className="flex flex-col gap-4 border-t border-borda pt-5">
        <p className="text-sm text-tinta-suave">
          Nas mensagens você pode usar <code className="text-tinta">{'{{cliente}}'}</code>,{' '}
          <code className="text-tinta">{'{{numero}}'}</code>,{' '}
          <code className="text-tinta">{'{{equipamento}}'}</code>,{' '}
          <code className="text-tinta">{'{{total}}'}</code> e{' '}
          <code className="text-tinta">{'{{saldo}}'}</code>.
        </p>

        <CampoTexto
          rotulo="Mensagem de orçamento"
          nome="modeloMsgOrcamento"
          rows={2}
          defaultValue={valores.modeloMsgOrcamento}
          erro={campos.modeloMsgOrcamento}
        />
        <CampoTexto
          rotulo="Mensagem de serviço pronto"
          nome="modeloMsgPronto"
          rows={2}
          defaultValue={valores.modeloMsgPronto}
          erro={campos.modeloMsgPronto}
        />
        <CampoTexto
          rotulo="Mensagem de cobrança"
          nome="modeloMsgCobranca"
          rows={2}
          defaultValue={valores.modeloMsgCobranca}
          erro={campos.modeloMsgCobranca}
        />
      </div>

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
      {resultado?.ok && <MensagemOk>Configurações salvas.</MensagemOk>}

      <Botao type="submit" disabled={pendente} className="self-start">
        {pendente ? 'Salvando…' : 'Salvar'}
      </Botao>
    </form>
  )
}
