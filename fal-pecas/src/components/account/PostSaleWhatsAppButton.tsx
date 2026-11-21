import { storeWhatsAppPhone, whatsAppHref, type PostSaleWaIntent } from '@/lib/whatsapp'
import { buildPostSaleWhatsAppMessage } from '@/lib/whatsapp'
import type { PostSaleReturnMode, PostSaleStage } from '@/lib/postSaleStages'

type Props = {
  orderNumber: string
  occurrenceId?: string | null
  stage?: PostSaleStage | string | null
  returnMode?: PostSaleReturnMode | null
  trackingCode?: string | null
  intent: PostSaleWaIntent
  label?: string
  variant?: 'button' | 'link'
  className?: string
}

export function PostSaleWhatsAppButton({
  orderNumber,
  occurrenceId,
  stage,
  returnMode,
  trackingCode,
  intent,
  label = 'Abrir WhatsApp',
  variant = 'button',
  className,
}: Props) {
  const phone = storeWhatsAppPhone()
  if (!phone) {
    return (
      <p className="m-0 text-sm font-semibold text-fal-fg">
        WhatsApp da loja indisponível neste momento — use o telefone do site.
      </p>
    )
  }

  const href = whatsAppHref(
    phone,
    buildPostSaleWhatsAppMessage({
      orderNumber,
      occurrenceId,
      stage,
      returnMode,
      trackingCode,
      intent,
    }),
  )

  if (variant === 'link') {
    return (
      <a
        className={
          className ?? 'font-semibold text-fal-navy underline dark:text-fal-fg'
        }
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        {label}
      </a>
    )
  }

  return (
    <a
      className={
        className ??
        'inline-flex items-center justify-center rounded-[10px] border border-[#25D366] bg-[#25D366]/15 px-4 py-2 text-sm font-extrabold text-[#128C7E] no-underline'
      }
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {label}
    </a>
  )
}
