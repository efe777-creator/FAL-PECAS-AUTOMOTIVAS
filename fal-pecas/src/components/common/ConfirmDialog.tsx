import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { useCallback, useState } from 'react'

export type ConfirmDialogOptions = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  /** Se true, pede um motivo obrigatório (substitui window.prompt). */
  requireReason?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
}

type Pending = ConfirmDialogOptions & {
  resolve: (value: { confirmed: boolean; reason?: string }) => void
}

let externalOpen: ((opts: ConfirmDialogOptions) => Promise<{ confirmed: boolean; reason?: string }>) | null =
  null

/** API imperativa compatível com fluxos que hoje usam window.confirm/prompt. */
export function confirmDialog(
  opts: ConfirmDialogOptions,
): Promise<{ confirmed: boolean; reason?: string }> {
  if (!externalOpen) {
    const ok = window.confirm(`${opts.title}\n\n${opts.message}`)
    return Promise.resolve({ confirmed: ok })
  }
  return externalOpen(opts)
}

export function ConfirmDialogHost() {
  const [pending, setPending] = useState<Pending | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)

  const open = useCallback((opts: ConfirmDialogOptions) => {
    return new Promise<{ confirmed: boolean; reason?: string }>((resolve) => {
      setReason('')
      setReasonError(null)
      setPending({ ...opts, resolve })
    })
  }, [])

  externalOpen = open

  function close(result: { confirmed: boolean; reason?: string }) {
    pending?.resolve(result)
    setPending(null)
    setReason('')
    setReasonError(null)
  }

  function onConfirm() {
    if (pending?.requireReason) {
      const trimmed = reason.trim()
      if (!trimmed) {
        setReasonError('Informe o motivo para continuar.')
        return
      }
      close({ confirmed: true, reason: trimmed })
      return
    }
    close({ confirmed: true })
  }

  return (
    <Modal
      open={Boolean(pending)}
      title={pending?.title ?? ''}
      onClose={() => close({ confirmed: false })}
    >
      {pending ? (
        <div className="space-y-4">
          <p className="m-0 text-sm text-fal-ink whitespace-pre-wrap">{pending.message}</p>
          {pending.requireReason ? (
            <label className="block text-sm font-semibold text-fal-navy">
              {pending.reasonLabel ?? 'Motivo'}
              <textarea
                className="mt-1 w-full rounded-[10px] border border-fal-line px-3 py-2 text-sm font-normal text-fal-ink"
                rows={3}
                value={reason}
                placeholder={pending.reasonPlaceholder ?? ''}
                onChange={(e) => {
                  setReason(e.target.value)
                  setReasonError(null)
                }}
              />
              {reasonError ? (
                <span className="mt-1 block text-xs font-semibold text-fal-danger">{reasonError}</span>
              ) : null}
            </label>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="light" onClick={() => close({ confirmed: false })}>
              {pending.cancelLabel ?? 'Cancelar'}
            </Button>
            <Button
              variant={pending.danger ? 'danger' : 'primary'}
              onClick={onConfirm}
            >
              {pending.confirmLabel ?? 'Confirmar'}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
