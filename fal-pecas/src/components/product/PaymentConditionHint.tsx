import {
  formatPaymentConditionLine,
  formatPixConditionLine,
  storefrontPrimaryAmount,
} from '@/lib/paymentDisplay'
import { usePaymentDisplay } from '@/hooks/usePaymentDisplay'
import { formatMoney } from '@/lib/money'

/**
 * Linhas de condição sobre o preço já resolvido (lista padrão ou promo).
 * Selo Oferta continua separado (lista × resolvido).
 */
export function PaymentConditionHint({
  amount,
  surface,
  className = '',
}: {
  /** Preço base resolvido da lista (sem condição de meio). */
  amount: number
  surface: 'card' | 'pdp'
  className?: string
}) {
  const settings = usePaymentDisplay()
  if (!(amount > 0) || !settings) return null

  const primary = storefrontPrimaryAmount(amount, settings)
  const pixLine = settings.pixEnabled !== false ? formatPixConditionLine(amount, settings) : null
  const creditLine = formatPaymentConditionLine(amount, settings, surface)

  // No card o preço principal já é a condição à vista — evita repetir Pix se for o destaque.
  const showPixOnCard =
    Boolean(pixLine) && (primary.method !== 'pix' || primary.adjustPercent !== 0)
  const showPix = surface === 'pdp' ? Boolean(pixLine) : showPixOnCard

  if (!showPix && !creditLine) return null

  return (
    <div
      className={
        className ||
        (surface === 'card' ? 'm-0 -mt-0.5 space-y-0.5' : 'mt-1 space-y-0.5')
      }
    >
      {showPix && pixLine ? (
        <p
          className={
            surface === 'card'
              ? 'm-0 truncate text-[11px] font-semibold text-emerald-800'
              : 'm-0 text-sm font-semibold text-emerald-800'
          }
        >
          {pixLine}
        </p>
      ) : null}
      {creditLine ? (
        <p
          className={
            surface === 'card'
              ? 'm-0 truncate text-[11px] font-semibold text-fal-navy/80'
              : 'm-0 text-sm font-semibold text-fal-navy'
          }
        >
          {primary.method === 'pix' && primary.adjustPercent !== 0
            ? `ou ${creditLine}`
            : creditLine}
        </p>
      ) : null}
      {surface === 'pdp' && settings.footnote ? (
        <span className="mt-0.5 block text-xs font-normal text-fal-muted">{settings.footnote}</span>
      ) : null}
      {surface === 'pdp' && primary.adjustPercent !== 0 ? (
        <span className="block text-xs text-fal-muted">
          Preço da lista {formatMoney(amount)} · condição {primary.label}
        </span>
      ) : null}
    </div>
  )
}

/** Preço de destaque do card/PDP após condição à vista. */
export function useStorefrontDisplayAmount(baseResolvedPrice: number): number {
  const settings = usePaymentDisplay()
  return storefrontPrimaryAmount(baseResolvedPrice, settings).amount
}
