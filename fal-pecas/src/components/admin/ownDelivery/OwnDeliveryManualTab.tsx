import { listOwnManualReviews } from '@/services/admin/adminOwnDeliveryService'
import { useEffect, useState } from 'react'

type Props = {
  onError?: (msg: string) => void
}

export function OwnDeliveryManualTab({ onError }: Props) {
  const [rows, setRows] = useState<unknown[]>([])
  const [showTech, setShowTech] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void listOwnManualReviews()
      .then(setRows)
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'Falha ao carregar análise manual'
        setError(msg)
        onError?.(msg)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga ao montar aba
  }, [])

  return (
    <div className="rounded-[14px] border border-fal-line bg-white p-4 text-sm">
      <h2 className="mt-0 text-lg font-extrabold text-fal-navy">Análise manual</h2>
      <p className="text-fal-muted">
        Pedidos que a cotação não conseguiu precificar sozinha ({rows.length}).
      </p>
      {error ? <p className="text-fal-danger">{error}</p> : null}
      {!rows.length && !error ? (
        <p>Nenhum caso no momento.</p>
      ) : showTech ? (
        <pre className="overflow-auto text-xs">{JSON.stringify(rows, null, 2)}</pre>
      ) : (
        <ul className="m-0 list-disc pl-5">
          {rows.map((row, i) => {
            const r = row as {
              id?: string
              status?: string
              message?: string
              created_at?: string
            }
            return (
              <li key={r.id ?? i}>
                {r.message || r.status || 'Caso'}{' '}
                {r.created_at ? (
                  <span className="text-fal-muted">
                    · {new Date(r.created_at).toLocaleString('pt-BR')}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
      {rows.length ? (
        <label className="mt-3 flex items-center gap-2 text-xs text-fal-muted">
          <input
            type="checkbox"
            checked={showTech}
            onChange={(e) => setShowTech(e.target.checked)}
          />
          Ver JSON técnico
        </label>
      ) : null}
    </div>
  )
}
