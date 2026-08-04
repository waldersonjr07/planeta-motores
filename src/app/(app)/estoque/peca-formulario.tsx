'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao, GradeFormulario } from '@/componentes/campo'
import { MensagemErro, MensagemOk } from '@/componentes/mensagem-erro'
import { acaoSalvarPeca } from '@/modulos/catalogo/acoes'

export function FormularioPeca() {
  const [resultado, enviar, pendente] = useActionState(acaoSalvarPeca, null)
  const campos = resultado && !resultado.ok ? (resultado.campos ?? {}) : {}

  return (
    <form action={enviar} className="flex flex-col gap-3">
      <GradeFormulario>
        <Campo
          rotulo="Nome da peça"
          nome="nome"
          required
          className="col-span-4"
          erro={campos.nome}
        />
        <Campo rotulo="Marca" nome="marca" className="col-span-3" />
        <CampoSelecao
          rotulo="Unidade"
          nome="unidade"
          className="col-span-2"
          opcoes={[
            { valor: 'un', texto: 'unidade' },
            { valor: 'L', texto: 'litro' },
            { valor: 'kg', texto: 'quilo' },
            { valor: 'm', texto: 'metro' },
          ]}
        />
        <Campo
          rotulo="Preço de venda"
          nome="precoVenda"
          placeholder="0,00"
          className="col-span-3"
          erro={campos.precoVenda}
        />

        <Campo
          rotulo="Quantidade mínima"
          nome="quantidadeMinima"
          placeholder="0"
          className="col-span-3"
          erro={campos.quantidadeMinima}
        />
        <label className="col-span-5 flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="controlaSaldo" className="size-4" />
          Controla saldo em estoque
        </label>
        <div className="col-span-4">
          <Botao type="submit" disabled={pendente} className="w-full">
            {pendente ? 'Salvando…' : 'Cadastrar peça'}
          </Botao>
        </div>
      </GradeFormulario>

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
      {resultado?.ok && <MensagemOk>Peça cadastrada.</MensagemOk>}
    </form>
  )
}
