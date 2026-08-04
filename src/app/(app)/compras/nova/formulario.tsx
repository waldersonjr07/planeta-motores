'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao, CampoTexto, GradeFormulario } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoRegistrarCompra } from '@/modulos/compras/acoes'

type Opcao = { id: string; texto: string }

export function FormularioCompra({
  pecas,
  fornecedores,
  ordens,
  hoje,
}: {
  pecas: Opcao[]
  fornecedores: Opcao[]
  ordens: Opcao[]
  hoje: string
}) {
  const [resultado, enviar, pendente] = useActionState(acaoRegistrarCompra, null)
  const [linhas, setLinhas] = useState([0])

  return (
    <form action={enviar} className="flex flex-col gap-6">
      <GradeFormulario>
        <CampoSelecao rotulo="Fornecedor" nome="fornecedorId" className="col-span-4">
          <option value="">Não informado</option>
          {fornecedores.map((f) => (
            <option key={f.id} value={f.id}>
              {f.texto}
            </option>
          ))}
        </CampoSelecao>

        <Campo
          rotulo="Data"
          nome="data"
          type="date"
          required
          defaultValue={hoje}
          className="col-span-2"
        />

        <CampoSelecao
          rotulo="OS que motivou a compra"
          nome="osId"
          className="col-span-4"
        >
          <option value="">Nenhuma (reposição de estoque)</option>
          {ordens.map((os) => (
            <option key={os.id} value={os.id}>
              {os.texto}
            </option>
          ))}
        </CampoSelecao>

        <Campo rotulo="Nota / documento" nome="numeroDocumento" className="col-span-2" />
      </GradeFormulario>

      <div className="flex flex-col gap-3 border-t border-borda pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-tinta-suave">
          Itens da compra
        </p>

        {linhas.map((linha) => (
          <GradeFormulario key={linha}>
            <CampoSelecao
              rotulo="Peça"
              nome="pecaId"
              className="col-span-6"
              aria-label={`Peça da linha ${linha + 1}`}
            >
              <option value="">Selecione…</option>
              {pecas.map((peca) => (
                <option key={peca.id} value={peca.id}>
                  {peca.texto}
                </option>
              ))}
            </CampoSelecao>

            <Campo
              rotulo="Quantidade"
              nome="quantidade"
              defaultValue="1"
              className="col-span-3"
              aria-label={`Quantidade da linha ${linha + 1}`}
            />

            <Campo
              rotulo="Custo unitário"
              nome="custo"
              placeholder="0,00"
              className="col-span-3"
              aria-label={`Custo unitário da linha ${linha + 1}`}
            />
          </GradeFormulario>
        ))}

        <Botao
          type="button"
          variante="secundario"
          className="self-start"
          onClick={() => setLinhas((atual) => [...atual, atual.length])}
        >
          Adicionar linha
        </Botao>
      </div>

      <CampoTexto rotulo="Observações" nome="observacoes" rows={2} />

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}

      <Botao type="submit" disabled={pendente} className="self-start">
        {pendente ? 'Registrando…' : 'Registrar compra'}
      </Botao>
    </form>
  )
}
