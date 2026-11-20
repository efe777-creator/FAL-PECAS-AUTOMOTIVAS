import { Modal } from '@/components/common/Modal'
import { ModalActions } from '@/components/common/ModalActions'
import { useCallback, useState } from 'react'

export type ConfirmDialogOptions = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  /** Se true, pede um motivo obrigatório (substitui window.prompt). */
  requireReason?: boolean
  /** Mostra campo de nota/motivo opcional (Cancelar = aborta). */
  askReason?: boolean
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
    const trimmed = reason.trim()
    if (pending?.requireReason) {
      if (!trimmed) {
        setReasonError('Informe o motivo para continuar.')
        return
      }
      close({ confirmed: true, reason: trimmed })
      return
    }
    if (pending?.askReason) {
      close({ confirmed: true, reason: trimmed || undefined })
      return
    }
    close({ confirmed: true })
  }

  return (
    <Modal
      open={Boolean(pending)}
      title={pending?.title ?? ''}
      onClose={() => close({ confirmed: false })}
      footer={
        pending ? (
          <ModalActions
            cancelLabel={pending.cancelLabel ?? 'Cancelar'}
            confirmLabel={pending.confirmLabel ?? 'Confirmar'}
            confirmVariant={pending.danger ? 'danger' : 'primary'}
            onCancel={() => close({ confirmed: false })}
            onConfirm={onConfirm}
          />
        ) : null
      }
    >
      {pending ? (
        <div className="space-y-4">
          <p className="m-0 whitespace-pre-wrap text-sm text-fal-ink">{pending.message}</p>
          {pending.requireReason || pending.askReason ? (
            <label className="block text-sm font-semibold text-fal-fg">
              {pending.reasonLabel ?? (pending.requireReason ? 'Motivo' : 'Nota (opcional)')}
              <textarea
                className="fal-field mt-1 w-full rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2 text-sm font-normal text-fal-fg placeholder:text-fal-muted"
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
        </div>
      ) : null}
    </Modal>
  )
}
