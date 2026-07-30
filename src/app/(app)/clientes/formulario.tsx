'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao, CampoTexto } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoAtualizarCliente, acaoCriarCliente } from '@/modulos/clientes/acoes'

type Cliente = {
  id: string
  nome: string
  tipoPessoa: 'fisica' | 'juridica'
  documento: string | null
  telefone: string | null
  email: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
  observacoes: string | null
}

export function FormularioCliente({ cliente }: { cliente?: Cliente }) {
  const acao = cliente ? acaoAtualizarCliente : acaoCriarCliente
  const [resultado, enviar, pendente] = useActionState(
    acao as typeof acaoAtualizarCliente,
    null,
  )
  const campos = resultado && !resultado.ok ? (resultado.campos ?? {}) : {}

  return (
    <form action={enviar} className="flex max-w-2xl flex-col gap-4">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}

      <div className="grid grid-cols-2 gap-4">
        <Campo
          rotulo="Nome"
          nome="nome"
          required
          defaultValue={cliente?.nome ?? ''}
          erro={campos.nome}
        />
        <CampoSelecao
          rotulo="Tipo de pessoa"
          nome="tipoPessoa"
          defaultValue={cliente?.tipoPessoa ?? 'fisica'}
          opcoes={[
            { valor: 'fisica', texto: 'Pessoa física' },
            { valor: 'juridica', texto: 'Pessoa jurídica' },
          ]}
        />
        <Campo
          rotulo="CPF/CNPJ"
          nome="documento"
          defaultValue={cliente?.documento ?? ''}
          erro={campos.documento}
        />
        <Campo
          rotulo="Telefone"
          nome="telefone"
          defaultValue={cliente?.telefone ?? ''}
          erro={campos.telefone}
        />
        <Campo
          rotulo="E-mail"
          nome="email"
          type="email"
          defaultValue={cliente?.email ?? ''}
          erro={campos.email}
        />
        <Campo
          rotulo="CEP"
          nome="cep"
          defaultValue={cliente?.cep ?? ''}
          erro={campos.cep}
        />
        <Campo rotulo="Logradouro" nome="logradouro" defaultValue={cliente?.logradouro ?? ''} />
        <Campo rotulo="Número" nome="numero" defaultValue={cliente?.numero ?? ''} />
        <Campo
          rotulo="Complemento"
          nome="complemento"
          defaultValue={cliente?.complemento ?? ''}
        />
        <Campo rotulo="Bairro" nome="bairro" defaultValue={cliente?.bairro ?? ''} />
        <Campo rotulo="Cidade" nome="cidade" defaultValue={cliente?.cidade ?? ''} />
        <Campo rotulo="UF" nome="uf" maxLength={2} defaultValue={cliente?.uf ?? ''} />
      </div>

      <CampoTexto
        rotulo="Observações"
        nome="observacoes"
        defaultValue={cliente?.observacoes ?? ''}
      />

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}

      <Botao type="submit" disabled={pendente} className="self-start">
        {pendente ? 'Salvando…' : 'Salvar'}
      </Botao>
    </form>
  )
}
