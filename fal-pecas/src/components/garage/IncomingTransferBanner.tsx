import { Button } from '@/components/common/Button'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  acceptVehicleTransfer,
  listIncomingTransfers,
  rejectVehicleTransfer,
  type TransferRequest,
} from '@/services/garage/vehicleTransferWizard'
import { useCallback, useEffect, useState } from 'react'

/** Convites pendentes na lista da garagem (destinatário ainda sem membership). */
export function IncomingTransferBanner({ onAccepted }: { onAccepted?: () => void }) {
  const toast = useToast()
  const [items, setItems] = useState<TransferRequest[]>([])
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    try {
      setItems(await listIncomingTransfers())
    } catch {
      setItems([])
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  if (!items.length) return null

  return (
    <div className="mb-4 space-y-2 rounded-fal border border-fal-line bg-fal-surface p-3">
      <p className="m-0 text-sm font-extrabold text-fal-fg">Transferências pendentes para você</p>
      {items.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-fal-muted">
            Identity {r.vehicleIdentityId.slice(0, 8)}… · de {r.fromCustomerId.slice(0, 8)}… ·
            expira {new Date(r.expiresAt).toLocaleString('pt-BR')}
          </span>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => {
              void (async () => {
                setBusy(true)
                try {
                  await acceptVehicleTransfer(r.id)
                  toast.push('Transferência aceita', 'success')
                  await reload()
                  onAccepted?.()
                } catch (e) {
                  toast.push(toUserMessage(e, 'Falha ao aceitar'), 'error')
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            Aceitar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="light"
            disabled={busy}
            onClick={() => {
              void (async () => {
                setBusy(true)
                try {
                  await rejectVehicleTransfer(r.id)
                  toast.push('Transferência rejeitada', 'success')
                  await reload()
                } catch (e) {
                  toast.push(toUserMessage(e, 'Falha ao rejeitar'), 'error')
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            Rejeitar
          </Button>
        </div>
      ))}
    </div>
  )
}
