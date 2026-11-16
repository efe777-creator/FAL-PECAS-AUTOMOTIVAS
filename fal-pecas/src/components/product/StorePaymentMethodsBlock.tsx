import {
  applyPaymentCondition,
  falMaxInstallmentsForCheckout,
  formatPaymentConditionLine,
  formatPixConditionLine,
} from '@/lib/paymentDisplay'
import { usePaymentDisplay } from '@/hooks/usePaymentDisplay'
import { usePaymentRoutingConfig } from '@/hooks/usePaymentRoutingConfig'
import { resolveEffectivePaymentAvailability } from '@/services/payments/effectivePaymentAvailability'
import { moneyToAmountCents } from '@/services/payments/routing/paymentRouter'
import { formatMoney } from '@/lib/money'

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
  const routing = usePaymentRoutingConfig()
  const avail = resolveEffectivePaymentAvailability(
    settings,
    routing,
    moneyToAmountCents(amount),
  )

  if (!avail.pix && !avail.card) return null

  const creditAmt = settings
    ? applyPaymentCondition(amount, 'credit_card', settings).amount
    : amount
  const installmentLine =
    avail.credit && settings
      ? formatPaymentConditionLine(amount, settings, surface)
      : null
  const maxN =
    avail.credit && settings ? falMaxInstallmentsForCheckout(creditAmt, settings) : 1
  const cardSub =
    installmentLine ??
    (avail.credit
      ? maxN > 1
        ? `Até ${maxN}x · ${formatMoney(creditAmt)}`
        : `À vista · ${formatMoney(creditAmt)}`
      : null)
  const pixLine = avail.pix && settings ? formatPixConditionLine(amount, settings) : null
  const debitAmt =
    avail.debit && settings
      ? applyPaymentCondition(amount, 'debit_card', settings).amount
      : null

  if (surface === 'card') {
    // No card de produto mantém só a linha curta já existente via PaymentConditionHint.
    return null
  }

  return (
    <div className={className || 'mt-4 space-y-2'}>
      <h3 className="m-0 text-sm font-extrabold text-fal-navy">Formas de pagamento</h3>
      <ul className="m-0 list-none space-y-2 p-0">
        {avail.credit ? (
          <li className="rounded-[10px] border border-fal-line bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-fal-ink">Cartão de crédito</span>
              <span className="text-xs font-bold text-emerald-800">Ativo</span>
            </div>
            {cardSub ? <p className="mb-0 mt-1 text-xs text-fal-muted">{cardSub}</p> : null}
          </li>
        ) : null}
        {avail.debit ? (
          <li className="rounded-[10px] border border-fal-line bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-fal-ink">Cartão de débito</span>
              <span className="text-xs font-bold text-emerald-800">Ativo</span>
            </div>
            <p className="mb-0 mt-1 text-xs text-fal-muted">
              À vista{debitAmt != null ? ` · ${formatMoney(debitAmt)}` : ''}
            </p>
          </li>
        ) : null}
        {avail.pix ? (
          <li className="rounded-[10px] border border-fal-line bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-fal-ink">Pix</span>
              <span className="text-xs font-bold text-emerald-800">Ativo</span>
            </div>
            <p className="mb-0 mt-1 text-xs text-fal-muted">
              {pixLine ?? 'Pagamento instantâneo'}
            </p>
          </li>
        ) : null}
      </ul>
    </div>
  )
}
