'use client'

import { useActionState, useEffect, useState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao, GradeFormulario } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoRegistrarDespesa } from '@/modulos/financeiro/acoes'
import { CATEGORIAS_DESPESA } from '@/modulos/financeiro/esquemas'

export function FormularioDespesa({ hoje }: { hoje: string }) {
  const [resultado, enviar, pendente] = useActionState(acaoRegistrarDespesa, null)
  const valores = resultado && !resultado.ok ? (resultado.valores ?? {}) : {}

  /*
   * O React 19 reseta o formulário quando a ação termina — dê erro ou não.
   * A `key` remonta o bloco de campos, que nasce de novo com os valores
   * devolvidos pela ação — e, com ele, o estado que espelha o seletor de
   * categoria. Diferente dos formulários de OS e de compra, este continua
   * montado depois de um envio bem-sucedido (não há `redirect`), então o
   * remonte tem de acontecer nos dois casos: só em erro, o `<select>` volta
   * sozinho para "Ferramenta" enquanto `categoria` no estado React ficava em
   * "outros", e o campo "Especifique" continuava aberto — pronto para gravar
   * descrição livre numa despesa que a tela já dizia ser "Ferramenta".
   */
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    if (resultado) setTentativa((n) => n + 1)
  }, [resultado])

  return (
    <form action={enviar} className="flex flex-col gap-3">
      <CamposDaDespesa
        key={tentativa}
        hoje={hoje}
        valores={valores}
        pendente={pendente}
      />

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
    </form>
  )
}

function CamposDaDespesa({
  hoje,
  valores,
  pendente,
}: {
  hoje: string
  valores: Record<string, string>
  pendente: boolean
}) {
  /*
   * Espelha o `<select>` para revelar o campo "Especifique". Mora aqui dentro,
   * e não no componente do formulário, justamente para o remonte o repor junto
   * com o DOM: fora daqui ele sobrevivia ao reset e passava a discordar do
   * seletor — categoria dizendo "Ferramenta" com o campo de descrição livre
   * aberto ao lado, que é o que a frente 2 existe para impedir.
   */
  const [categoria, setCategoria] = useState(valores.categoria || 'ferramenta')
  const ehOutros = categoria === 'outros'

  return (
    <GradeFormulario>
      <Campo
        rotulo="Data"
        nome="data"
        type="date"
        defaultValue={valores.data || hoje}
        className="col-span-2"
      />
      <CampoSelecao
        rotulo="Categoria"
        nome="categoria"
        className="col-span-2"
        defaultValue={valores.categoria || undefined}
        onChange={(evento) => setCategoria(evento.target.value)}
        opcoes={Object.entries(CATEGORIAS_DESPESA).map(([valor, texto]) => ({
          valor,
          texto,
        }))}
      />
      {ehOutros && (
        <Campo
          rotulo="Especifique (opcional)"
          nome="descricao"
          className="col-span-4"
          placeholder="Conserto do portão…"
          defaultValue={valores.descricao ?? ''}
        />
      )}
      <Campo
        rotulo="Valor"
        nome="valor"
        required
        placeholder="0,00"
        defaultValue={valores.valor ?? ''}
        className={ehOutros ? 'col-span-2' : 'col-span-4'}
      />
      <div className={ehOutros ? 'col-span-2' : 'col-span-4'}>
        <Botao type="submit" disabled={pendente} className="w-full">
          {pendente ? 'Lançando…' : 'Lançar despesa'}
        </Botao>
      </div>
    </GradeFormulario>
  )
}
