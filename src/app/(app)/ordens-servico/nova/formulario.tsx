'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao, CampoTexto, GradeFormulario } from '@/componentes/campo'
import { CampoMascarado } from '@/componentes/campo-mascarado'
import { MensagemErro } from '@/componentes/mensagem-erro'
import type { EquipamentoParaSelecao } from '@/modulos/clientes/equipamentos-consultas'
import { APLICACOES } from '@/modulos/clientes/equipamentos-descricao'
import { acaoCriarOs } from '@/modulos/os/acoes'

export function FormularioNovaOs({
  equipamentos,
}: {
  equipamentos: EquipamentoParaSelecao[]
}) {
  const [resultado, enviar, pendente] = useActionState(acaoCriarOs, null)
  const [clienteNovo, setClienteNovo] = useState(equipamentos.length === 0)
  const [aplicacaoOutro, setAplicacaoOutro] = useState(false)
  const campos = resultado && !resultado.ok ? (resultado.campos ?? {}) : {}

  // Agrupa por cliente para o <optgroup>: a Lucilene procura pelo dono do
  // motor, não pelo motor solto.
  const porCliente = new Map<string, EquipamentoParaSelecao[]>()
  for (const equipamento of equipamentos) {
    const lista = porCliente.get(equipamento.clienteNome) ?? []
    lista.push(equipamento)
    porCliente.set(equipamento.clienteNome, lista)
  }

  return (
    <form action={enviar} className="flex flex-col gap-5">
      <GradeFormulario>
        <CampoSelecao
          rotulo="Cliente e equipamento"
          nome="equipamento"
          required
          className="col-span-8"
          defaultValue={equipamentos.length === 0 ? 'novo' : ''}
          onChange={(evento) => setClienteNovo(evento.target.value === 'novo')}
        >
          <option value="">Selecione…</option>
          {/* Fora dos grupos: não é cliente da carteira, é cadastro na hora. */}
          <option value="novo">Cliente novo (digitar)</option>
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
      </GradeFormulario>

      {clienteNovo && (
        <div className="flex flex-col gap-4 rounded-lg border border-borda bg-realce p-4">
          <div>
            <p className="text-sm font-semibold">Cadastro rápido</p>
            <p className="mt-0.5 text-sm text-tinta-suave">
              Cliente e máquina entram no cadastro junto com a OS. O que faltar se
              completa depois, na ficha do cliente.
            </p>
          </div>

          <GradeFormulario>
            <Campo
              rotulo="Nome do cliente"
              nome="nomeCliente"
              required={clienteNovo}
              className="col-span-6"
              erro={campos.nomeCliente}
            />
            <CampoMascarado
              rotulo="CPF/CNPJ"
              nome="documentoCliente"
              mascara="documento"
              className="col-span-3"
              erro={campos.documentoCliente}
            />
            <CampoMascarado
              rotulo="Telefone"
              nome="telefoneCliente"
              mascara="telefone"
              className="col-span-3"
              erro={campos.telefoneCliente}
            />

            <CampoSelecao
              rotulo="Máquina"
              nome="aplicacao"
              className="col-span-3"
              onChange={(evento) => setAplicacaoOutro(evento.target.value === 'outro')}
              opcoes={Object.entries(APLICACOES).map(([valor, texto]) => ({
                valor,
                texto,
              }))}
            />

            {aplicacaoOutro && (
              <Campo
                rotulo="Qual máquina?"
                nome="aplicacaoOutra"
                required
                className="col-span-4"
                placeholder="Cortador de grama, compactador…"
                erro={campos.aplicacaoOutra}
              />
            )}
            <CampoSelecao
              rotulo="Motor"
              nome="tipoMotor"
              className="col-span-2"
              opcoes={[
                { valor: '2T', texto: '2 tempos' },
                { valor: '4T', texto: '4 tempos' },
              ]}
            />
            <Campo rotulo="Marca" nome="marca" className="col-span-3" />
            <Campo rotulo="Modelo" nome="modelo" className="col-span-4" />
          </GradeFormulario>
        </div>
      )}

      <GradeFormulario>
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
