'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao, GradeFormulario } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { Vazio } from '@/componentes/pagina'
import { acaoEnviarFoto, acaoRemoverFoto } from '@/modulos/os/acoes'
import { MOMENTOS, type MomentoFoto } from '@/modulos/os/momentos'

type Foto = {
  id: string
  momento: MomentoFoto
  legenda: string | null
}

export function AbaFotos({ osId, fotos }: { osId: string; fotos: Foto[] }) {
  const [resultado, enviar, pendente] = useActionState(acaoEnviarFoto, null)

  return (
    <div className="flex flex-col gap-6">
      {fotos.length === 0 ? (
        <Vazio>
          Nenhuma foto anexada. Registrar o estado na chegada evita discussão depois.
        </Vazio>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {fotos.map((foto) => (
            <li
              key={foto.id}
              className="overflow-hidden rounded-lg border border-borda bg-superficie"
            >
              {/* Rota autenticada, não arquivo público. */}
              <img
                src={`/api/fotos/${foto.id}`}
                alt={foto.legenda ?? MOMENTOS[foto.momento]}
                className="h-40 w-full bg-realce object-cover"
              />
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <p className="min-w-0 truncate text-xs text-tinta-suave">
                  {MOMENTOS[foto.momento]}
                  {foto.legenda && ` · ${foto.legenda}`}
                </p>
                <form action={acaoRemoverFoto}>
                  <input type="hidden" name="fotoId" value={foto.id} />
                  <input type="hidden" name="osId" value={osId} />
                  <Botao variante="discreto" type="submit">
                    Remover
                  </Botao>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={enviar} className="flex flex-col gap-3 border-t border-borda pt-5">
        <input type="hidden" name="osId" value={osId} />

        <GradeFormulario>
          <label className="col-span-4 flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-tinta-suave">
              Foto
            </span>
            <input
              type="file"
              name="arquivo"
              accept="image/jpeg,image/png,image/webp"
              required
              className="text-sm file:mr-3 file:rounded-md file:border file:border-borda-forte file:bg-superficie file:px-3 file:py-1.5 file:text-sm"
            />
          </label>

          <CampoSelecao
            rotulo="Momento"
            nome="momento"
            className="col-span-3"
            opcoes={Object.entries(MOMENTOS).map(([valor, texto]) => ({ valor, texto }))}
          />

          <Campo rotulo="Legenda" nome="legenda" className="col-span-3" />

          <div className="col-span-2">
            <Botao type="submit" disabled={pendente} className="w-full">
              {pendente ? 'Enviando…' : 'Anexar foto'}
            </Botao>
          </div>
        </GradeFormulario>

        {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
      </form>
    </div>
  )
}
