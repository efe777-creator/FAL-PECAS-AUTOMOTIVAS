import { falMaxInstallmentsForCheckout, formatPaymentConditionLine } from '@/lib/paymentDisplay'
import { usePaymentDisplay } from '@/hooks/usePaymentDisplay'
import { resolveEffectivePaymentAvailability } from '@/services/payments/effectivePaymentAvailability'

/**
 * Cards / PDP — formas de pagamento efetivas (integração ∩ comercial).
 */
export function StorePaymentMethodsBlock({
  amount,
  surface = 'pdp',
  className = '',
}: {
  amount: number
  surface?: 'card' | 'pdp'
  className?: string
}) {
  const settings = usePaymentDisplay()
  const avail = resolveEffectivePaymentAvailability(settings)

  if (!avail.pix && !avail.card) return null

  const installmentLine =
    avail.card && settings
      ? formatPaymentConditionLine(amount, settings, surface)
      : null
  const maxN =
    avail.card && settings ? falMaxInstallmentsForCheckout(amount, settings) : 1
  const cardSub =
    installmentLine ??
    (avail.card
      ? maxN > 1
        ? `Até ${maxN}x, conforme condições disponíveis`
        : 'À vista no cartão'
      : null)

  if (surface === 'card') {
    // No card de produto mantém só a linha curta já existente via PaymentConditionHint.
    return null
  }

  return (
    <div className={className || 'mt-4 space-y-2'}>
      <h3 className="m-0 text-sm font-extrabold text-fal-navy">Formas de pagamento</h3>
      <ul className="m-0 list-none space-y-2 p-0">
        {avail.card ? (
          <li className="rounded-[10px] border border-fal-line bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-fal-ink">Cartão de crédito</span>
              <span className="text-xs font-bold text-emerald-800">Ativo</span>
            </div>
            {cardSub ? <p className="mb-0 mt-1 text-xs text-fal-muted">{cardSub}</p> : null}
          </li>
        ) : null}
        {avail.pix ? (
          <li className="rounded-[10px] border border-fal-line bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-fal-ink">Pix</span>
              <span className="text-xs font-bold text-emerald-800">Ativo</span>
            </div>
            <p className="mb-0 mt-1 text-xs text-fal-muted">Pagamento instantâneo</p>
          </li>
        ) : null}
      </ul>
    </div>
  )
}
