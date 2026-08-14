'use client'

import { Fragment, useActionState, useEffect, useState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao, CampoTexto, GradeFormulario } from '@/componentes/campo'
import { CampoCombo, type OpcaoCombo } from '@/componentes/campo-combo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoRegistrarCompra } from '@/modulos/compras/acoes'

type Opcao = OpcaoCombo

/**
 * O que o combo mostra ao voltar do eco: o texto da opção quando a escolha
 * veio da lista, ou o que foi digitado quando era cadastro novo.
 */
function textoDoEco(opcoes: Opcao[], id?: string, digitado?: string): string {
  if (id) return opcoes.find((opcao) => opcao.id === id)?.texto ?? ''
  return digitado ?? ''
}

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
  // Fora do remonte de propósito: quantas linhas existem não é campo do
  // formulário, e perder as linhas acrescentadas seria pior que o defeito.
  const [linhas, setLinhas] = useState([0])

  const valores = resultado && !resultado.ok ? (resultado.valores ?? {}) : {}
  const listas = resultado && !resultado.ok ? (resultado.listas ?? {}) : {}

  /*
   * O React 19 reseta o formulário quando a ação termina, e este é o mais
   * longo do sistema: sem isto, uma quantidade mal digitada apagava fornecedor,
   * nota, observações e todas as linhas de item. Repor só o `defaultValue` não
   * basta — trocar essa prop não altera um input já montado —, então a `key`
   * força o remonte e cada campo nasce com o valor devolvido pela ação.
   */
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    if (resultado && !resultado.ok) setTentativa((n) => n + 1)
  }, [resultado])

  return (
    <form action={enviar} className="flex flex-col gap-6">
      <GradeFormulario>
        <Fragment key={tentativa}>
          <CampoCombo
            rotulo="Fornecedor"
            nome="fornecedor"
            opcoes={fornecedores}
            permiteCriar
            rotuloCriar={(texto) => `Cadastrar “${texto}” como fornecedor novo`}
            placeholder="Digite para procurar ou cadastrar"
            className="col-span-4"
            idInicial={valores.fornecedorId}
            textoInicial={textoDoEco(
              fornecedores,
              valores.fornecedorId,
              valores.fornecedorNome,
            )}
          />

          <Campo
            rotulo="Data"
            nome="data"
            type="date"
            required
            defaultValue={valores.data || hoje}
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
            idInicial={valores.osId}
            textoInicial={textoDoEco(ordens, valores.osId)}
          />

          <Campo
            rotulo="Nota / documento"
            nome="numeroDocumento"
            className="col-span-2"
            defaultValue={valores.numeroDocumento ?? ''}
          />
        </Fragment>
      </GradeFormulario>

      <div className="flex flex-col gap-3 border-t border-borda pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-tinta-suave">
          Itens da compra
        </p>

        {/*
          A linha inteira remonta a cada tentativa, com a mesma `key` do
          cabeçalho: as listas do eco vêm na ordem em que o navegador entregou
          os campos, então a posição na lista é a posição na tela.
        */}
        {linhas.map((linha) => (
          <LinhaDeItem
            key={`${tentativa}:${linha}`}
            posicao={linha}
            pecas={pecas}
            eco={{
              pecaId: listas.pecaId?.[linha],
              pecaNome: listas.pecaNome?.[linha],
              unidadeNova: listas.unidadeNova?.[linha],
              quantidade: listas.quantidade?.[linha],
              custo: listas.custo?.[linha],
            }}
          />
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

      <CampoTexto
        key={tentativa}
        rotulo="Observações"
        nome="observacoes"
        rows={2}
        defaultValue={valores.observacoes ?? ''}
      />

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}

      <Botao type="submit" disabled={pendente} className="self-start">
        {pendente ? 'Registrando…' : 'Registrar compra'}
      </Botao>
    </form>
  )
}

function LinhaDeItem({
  posicao,
  pecas,
  eco,
}: {
  posicao: number
  pecas: Opcao[]
  eco: {
    pecaId?: string
    pecaNome?: string
    unidadeNova?: string
    quantidade?: string
    custo?: string
  }
}) {
  /*
   * Espelha o combo para revelar o seletor de unidade. Mora na linha, que a
   * `key` remonta, e nasce do mesmo eco que alimenta os `defaultValue`: como
   * estado do formulário inteiro sobreviveria ao reset do React 19 e passaria
   * a discordar do que está na tela.
   */
  const [pecaNova, setPecaNova] = useState(Boolean(eco.pecaNome))

  return (
    <GradeFormulario>
      <CampoCombo
        rotulo="Peça"
        nome="peca"
        opcoes={pecas}
        permiteCriar
        rotuloCriar={(texto) => `Cadastrar “${texto}” como peça nova`}
        placeholder="Digite para procurar ou cadastrar"
        className="col-span-4"
        aria-label={`Peça da linha ${posicao + 1}`}
        aoMudar={({ id, nome }) => setPecaNova(!id && Boolean(nome))}
        idInicial={eco.pecaId}
        textoInicial={textoDoEco(pecas, eco.pecaId, eco.pecaNome)}
      />

      {/*
        A oficina compra óleo em litro. Peça nova caindo em "un" por omissão
        faria 0,5 L virar meia unidade no saldo.

        Sempre renderizado, escondido por CSS quando não se aplica: se saísse
        do DOM, `getAll('unidadeNova')` encurtaria e deixaria de casar por
        posição com as outras listas da linha.
      */}
      <div className={pecaNova ? 'col-span-2' : 'hidden'}>
        <CampoSelecao
          rotulo="Unidade"
          nome="unidadeNova"
          aria-label={`Unidade da linha ${posicao + 1}`}
          defaultValue={eco.unidadeNova || undefined}
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
        defaultValue={eco.quantidade ?? '1'}
        className="col-span-3"
        aria-label={`Quantidade da linha ${posicao + 1}`}
      />

      <Campo
        rotulo="Custo unitário"
        nome="custo"
        placeholder="0,00"
        defaultValue={eco.custo ?? ''}
        className="col-span-3"
        aria-label={`Custo unitário da linha ${posicao + 1}`}
      />
    </GradeFormulario>
  )
}
