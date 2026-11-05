import { formatPaymentConditionLine } from '@/lib/paymentDisplay'
import { usePaymentDisplay } from '@/hooks/usePaymentDisplay'

export function PaymentConditionHint({
  amount,
  surface,
  className = '',
}: {
  amount: number
  surface: 'card' | 'pdp'
  className?: string
}) {
  const settings = usePaymentDisplay()
  const line = formatPaymentConditionLine(amount, settings, surface)
  if (!line) return null

  return (
    <p
      className={
        className ||
        (surface === 'card'
          ? 'm-0 -mt-0.5 truncate text-[11px] font-semibold text-fal-navy/80'
          : 'mt-1 text-sm font-semibold text-fal-navy')
      }
    >
      {line}
      {surface === 'pdp' && settings?.footnote ? (
        <span className="mt-0.5 block text-xs font-normal text-fal-muted">{settings.footnote}</span>
      ) : null}
    </p>
  )
}
