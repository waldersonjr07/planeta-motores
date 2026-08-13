'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao, CampoTexto, GradeFormulario } from '@/componentes/campo'
import { CampoCombo, type OpcaoCombo } from '@/componentes/campo-combo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoRegistrarCompra } from '@/modulos/compras/acoes'

type Opcao = OpcaoCombo

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
  // Guarda quais linhas estão criando peça nova, para revelar a unidade.
  const [pecaNova, setPecaNova] = useState<Record<number, boolean>>({})

  return (
    <form action={enviar} className="flex flex-col gap-6">
      <GradeFormulario>
        <CampoCombo
          rotulo="Fornecedor"
          nome="fornecedor"
          opcoes={fornecedores}
          permiteCriar
          rotuloCriar={(texto) => `Cadastrar “${texto}” como fornecedor novo`}
          placeholder="Digite para procurar ou cadastrar"
          className="col-span-4"
        />

        <Campo
          rotulo="Data"
          nome="data"
          type="date"
          required
          defaultValue={hoje}
          className="col-span-2"
        />

        {/*
          A OS filtra enquanto se digita, mas não se cria daqui: uma OS nasce
          de um equipamento recebido, com problema relatado e situação inicial.
        */}
        <CampoCombo
          rotulo="OS que motivou a compra"
          nome="os"
          opcoes={ordens}
          placeholder="Nenhuma (reposição de estoque)"
          className="col-span-4"
        />

        <Campo rotulo="Nota / documento" nome="numeroDocumento" className="col-span-2" />
      </GradeFormulario>

      <div className="flex flex-col gap-3 border-t border-borda pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-tinta-suave">
          Itens da compra
        </p>

        {linhas.map((linha) => (
          <GradeFormulario key={linha}>
            <CampoCombo
              rotulo="Peça"
              nome="peca"
              opcoes={pecas}
              permiteCriar
              rotuloCriar={(texto) => `Cadastrar “${texto}” como peça nova`}
              placeholder="Digite para procurar ou cadastrar"
              className="col-span-4"
              aria-label={`Peça da linha ${linha + 1}`}
              aoMudar={({ id, nome }) =>
                setPecaNova((atual) => ({ ...atual, [linha]: !id && Boolean(nome) }))
              }
            />

            {/*
              A oficina compra óleo em litro. Peça nova caindo em "un" por
              omissão faria 0,5 L virar meia unidade no saldo.

              Sempre renderizado, escondido por CSS quando não se aplica: se
              saísse do DOM, `getAll('unidadeNova')` encurtaria e deixaria de
              casar por posição com as outras listas da linha.
            */}
            <div className={pecaNova[linha] ? 'col-span-2' : 'hidden'}>
              <CampoSelecao
                rotulo="Unidade"
                nome="unidadeNova"
                aria-label={`Unidade da linha ${linha + 1}`}
                opcoes={[
                  { valor: 'un', texto: 'Unidade' },
                  { valor: 'L', texto: 'Litro' },
                  { valor: 'mL', texto: 'Mililitro' },
                ]}
              />
            </div>

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
