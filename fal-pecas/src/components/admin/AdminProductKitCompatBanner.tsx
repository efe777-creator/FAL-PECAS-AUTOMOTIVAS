import { Button } from '@/components/common/Button'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import { adminClearKitCompatReview } from '@/services/admin/adminProductService'
import { useState } from 'react'

type Props = {
  kitProductId: string
  reviewRequired: boolean
  onCleared?: () => void
}

/** K5: alerta H6 — PVC de componente mudou; kit precisa revisão própria. */
export function AdminProductKitCompatBanner({
  kitProductId,
  reviewRequired,
  onCleared,
}: Props) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  // Idle: sem banner — a seção de aplicações já deixa claro o PVC próprio.
  if (!reviewRequired) return null

  async function clearReview() {
    setBusy(true)
    try {
      await adminClearKitCompatReview(kitProductId)
      toast.push('Revisão de compatibilidade confirmada', 'success')
      onCleared?.()
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao confirmar revisão'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="rounded-[10px] border border-fal-warning/40 bg-fal-warning/15 px-3 py-2 text-sm text-fal-fg"
      role="alert"
    >
      <p className="m-0 font-bold">Revisão de compatibilidade pendente</p>
      <p className="mt-1 mb-2 text-xs">
        A aplicação de um componente mudou. Revise o PVC <strong>próprio</strong> deste kit
        (não use herança automática) e confirme antes de republicar / liberar na loja.
      </p>
      <Button type="button" disabled={busy} onClick={() => void clearReview()}>
        {busy ? '…' : 'Marcar como revisado'}
      </Button>
    </div>
  )
}
