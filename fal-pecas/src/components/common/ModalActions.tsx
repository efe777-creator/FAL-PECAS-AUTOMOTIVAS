import { Button } from '@/components/common/Button'
import type { ButtonVariant } from '@/components/common/Button'

type Props = {
  cancelLabel?: string
  confirmLabel?: string
  onCancel: () => void
  onConfirm: () => void
  confirmDisabled?: boolean
  confirmVariant?: ButtonVariant
}

/** CTAs do Modal/sheet: empilhados no mobile (primário embaixo), fila no desktop. */
export function ModalActions({
  cancelLabel = 'Cancelar',
  confirmLabel = 'Confirmar',
  onCancel,
  onConfirm,
  confirmDisabled = false,
  confirmVariant = 'primary',
}: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
      <Button variant="light" fullWidth className="sm:w-auto" type="button" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button
        variant={confirmVariant}
        fullWidth
        className="sm:w-auto"
        type="button"
        disabled={confirmDisabled}
        onClick={onConfirm}
      >
        {confirmLabel}
      </Button>
    </div>
  )
}
