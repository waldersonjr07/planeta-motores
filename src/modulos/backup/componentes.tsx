import type { EstadoDoBackup } from './estado'

/**
 * Banner de alerta para cópia de segurança ausente, atrasada ou com falha na nuvem.
 * Exibido no topo do layout da aplicação para ser visível em qualquer rota.
 */
export function AvisoDeBackup({ estado }: { estado?: EstadoDoBackup | null }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-400"
    >
      <p className="font-medium">
        A cópia de segurança do sistema não está sendo feita. Avise o Walderson.
      </p>
      {estado?.situacao === 'falha-externa' && (
        <p className="mt-1 text-xs text-red-300">
          A cópia local foi gerada, mas o envio para a nuvem (B2) falhou ou não foi configurado.
          {estado.motivo ? ` Detalhe: ${estado.motivo}` : ''}
        </p>
      )}
    </div>
  )
}
