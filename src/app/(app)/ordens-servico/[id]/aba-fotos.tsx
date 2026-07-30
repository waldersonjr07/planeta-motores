'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { MensagemErro } from '@/componentes/mensagem-erro'
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
    <div className="flex flex-col gap-4">
      {fotos.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhuma foto anexada.</p>
      ) : (
        <ul className="flex flex-wrap gap-4">
          {fotos.map((foto) => (
            <li key={foto.id} className="w-56 rounded border border-gray-200 p-2">
              {/* Rota autenticada, não arquivo público. */}
              <img
                src={`/api/fotos/${foto.id}`}
                alt={foto.legenda ?? MOMENTOS[foto.momento]}
                className="h-40 w-full rounded object-cover"
              />
              <p className="mt-2 text-xs text-gray-600">
                {MOMENTOS[foto.momento]}
                {foto.legenda && ` · ${foto.legenda}`}
              </p>
              <form action={acaoRemoverFoto} className="mt-2">
                <input type="hidden" name="fotoId" value={foto.id} />
                <input type="hidden" name="osId" value={osId} />
                <Botao variante="secundario" type="submit">
                  Remover
                </Botao>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form
        action={enviar}
        className="flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4"
      >
        <input type="hidden" name="osId" value={osId} />

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700">Foto</span>
          <input
            type="file"
            name="arquivo"
            accept="image/jpeg,image/png,image/webp"
            required
            className="text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700">Momento</span>
          <select
            name="momento"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            {Object.entries(MOMENTOS).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700">Legenda</span>
          <input
            name="legenda"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <Botao type="submit" disabled={pendente}>
          {pendente ? 'Enviando…' : 'Anexar foto'}
        </Botao>

        {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
      </form>
    </div>
  )
}
