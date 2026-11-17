import { DropdownMenu } from '@/components/common/DropdownMenu'
import { useToast } from '@/components/common/Toast'
import { printOrderDocument } from '@/lib/adminOrderPrint'
import { isPdfStubDisabled } from '@/lib/orderPreviewPolicy'
import { toUserMessage } from '@/lib/toUserMessage'

type Props = {
  orderId: string
  onOpenPreview?: () => void
  /** Omitir quando já estamos na página completa. */
  onOpenFull?: () => void
}

export function OrderRowActionsMenu({ orderId, onOpenPreview, onOpenFull }: Props) {
  const toast = useToast()

  async function runPrint(kind: 'separation' | 'romaneio') {
    try {
      const r = await printOrderDocument(orderId, kind)
      if (r === 'ok') return
      if (r === 'blocked') toast.push('Permita pop-ups para imprimir', 'error')
      else if (r === 'not_found') toast.push('Pedido não encontrado', 'error')
      else toast.push('Falha ao preparar impressão', 'error')
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao imprimir'), 'error')
    }
  }

  return (
    <DropdownMenu
      aria-label="Ações do pedido"
      trigger={<span aria-hidden>⋯</span>}
      items={[
        ...(onOpenPreview
          ? [
              {
                id: 'open-preview',
                label: 'Abrir preview',
                onSelect: onOpenPreview,
              },
            ]
          : []),
        ...(onOpenFull
          ? [
              {
                id: 'open-full',
                label: 'Abrir página completa',
                onSelect: onOpenFull,
              },
            ]
          : []),
        {
          id: 'copy-id',
          label: 'Copiar ID',
          onSelect: () => {
            void navigator.clipboard?.writeText(orderId).then(
              () => toast.push('ID copiado', 'success'),
              () => toast.push('Não foi possível copiar', 'error'),
            )
          },
        },
        {
          id: 'print-separation',
          label: 'Imprimir lista de separação',
          onSelect: () => void runPrint('separation'),
        },
        {
          id: 'print-romaneio',
          label: 'Imprimir romaneio',
          onSelect: () => void runPrint('romaneio'),
        },
        {
          id: 'pdf-stub',
          label: 'Gerar PDF (em breve)',
          onSelect: () => undefined,
          disabled: isPdfStubDisabled(),
        },
      ]}
    />
  )
}
