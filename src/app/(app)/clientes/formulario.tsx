'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao, CampoTexto, GradeFormulario } from '@/componentes/campo'
import { CampoMascarado } from '@/componentes/campo-mascarado'
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
    <form action={enviar} className="flex flex-col gap-6">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}

      <GradeFormulario>
        <Campo
          rotulo="Nome"
          nome="nome"
          required
          className="col-span-6"
          defaultValue={cliente?.nome ?? ''}
          erro={campos.nome}
        />
        <CampoSelecao
          rotulo="Tipo de pessoa"
          nome="tipoPessoa"
          className="col-span-3"
          defaultValue={cliente?.tipoPessoa ?? 'fisica'}
          opcoes={[
            { valor: 'fisica', texto: 'Pessoa física' },
            { valor: 'juridica', texto: 'Pessoa jurídica' },
          ]}
        />
        <CampoMascarado
          rotulo="CPF/CNPJ"
          nome="documento"
          mascara="documento"
          className="col-span-3"
          defaultValue={cliente?.documento ?? ''}
          erro={campos.documento}
        />

        <CampoMascarado
          rotulo="Telefone"
          nome="telefone"
          mascara="telefone"
          className="col-span-3"
          defaultValue={cliente?.telefone ?? ''}
          erro={campos.telefone}
        />
        <Campo
          rotulo="E-mail"
          nome="email"
          type="email"
          className="col-span-5"
          defaultValue={cliente?.email ?? ''}
          erro={campos.email}
        />
        <CampoMascarado
          rotulo="CEP"
          nome="cep"
          mascara="cep"
          className="col-span-4"
          defaultValue={cliente?.cep ?? ''}
          erro={campos.cep}
        />

        <Campo
          rotulo="Logradouro"
          nome="logradouro"
          className="col-span-6"
          defaultValue={cliente?.logradouro ?? ''}
        />
        <Campo
          rotulo="Número"
          nome="numero"
          className="col-span-2"
          defaultValue={cliente?.numero ?? ''}
        />
        <Campo
          rotulo="Complemento"
          nome="complemento"
          className="col-span-4"
          defaultValue={cliente?.complemento ?? ''}
        />

        <Campo
          rotulo="Bairro"
          nome="bairro"
          className="col-span-4"
          defaultValue={cliente?.bairro ?? ''}
        />
        <Campo
          rotulo="Cidade"
          nome="cidade"
          className="col-span-6"
          defaultValue={cliente?.cidade ?? ''}
        />
        <Campo
          rotulo="UF"
          nome="uf"
          maxLength={2}
          className="col-span-2"
          defaultValue={cliente?.uf ?? ''}
        />

        <CampoTexto
          rotulo="Observações"
          nome="observacoes"
          className="col-span-12"
          defaultValue={cliente?.observacoes ?? ''}
        />
      </GradeFormulario>

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}

      <Botao type="submit" disabled={pendente} className="self-start">
        {pendente ? 'Salvando…' : 'Salvar'}
      </Botao>
    </form>
  )
}
