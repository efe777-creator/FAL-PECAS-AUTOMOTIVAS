import { Button } from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { usePaymentDisplay } from '@/hooks/usePaymentDisplay'
import { falMaxInstallmentsForCheckout, formatPaymentConditionLine } from '@/lib/paymentDisplay'
import { formatMoney } from '@/lib/money'
import { toUserMessage } from '@/lib/toUserMessage'
import { useCheckoutOrderPaymentWatch } from '@/hooks/useCheckoutOrderPaymentWatch'
import { createFalPayment } from '@/services/payments/engine'
import { syncCheckoutPayment } from '@/services/payments/paymentSyncService'
import { useState } from 'react'

interface Props {
  orderId: string
  amount: number
  preferredPaymentType: 'credit_card' | 'debit_card'
  onApproved: (orderId: string) => void
  onError: (message: string) => void
}

/**
 * Cartão FAL PAY via página segura (invoiceUrl) — sem PAN na loja.
 */
export function AsaasCardPanel({
  orderId,
  amount,
  preferredPaymentType,
  onApproved,
  onError,
}: Props) {
  const paymentDisplay = usePaymentDisplay()
  const maxInstallments =
    preferredPaymentType === 'debit_card'
      ? 1
      : falMaxInstallmentsForCheckout(amount, paymentDisplay)
  const [installments, setInstallments] = useState(Math.min(maxInstallments, 1))
  const [busy, setBusy] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)

  useCheckoutOrderPaymentWatch({
    orderId,
    enabled: Boolean(paymentId),
    paymentId,
    onSettled: onApproved,
  })

  const conditionLine = formatPaymentConditionLine(amount, paymentDisplay, 'pdp')

  async function openPayment() {
    if (!(amount >= 5)) {
      onError('O valor mínimo para pagamento com cartão é R$ 5,00. Use Pix ou aumente o pedido.')
      return
    }
    setBusy(true)
    try {
      const res = await createFalPayment({
        orderId,
        method: preferredPaymentType,
        installments: preferredPaymentType === 'debit_card' ? 1 : installments,
      })
      if (!res.paymentUrl) {
        throw new Error('Não foi possível abrir o pagamento com cartão. Tente novamente.')
      }
      setPaymentId(res.paymentId)
      setPaymentUrl(res.paymentUrl)
      window.open(res.paymentUrl, '_blank', 'noopener,noreferrer')
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao preparar pagamento com cartão.'))
    } finally {
      setBusy(false)
    }
  }

  async function checkStatus() {
    if (!paymentId) return
    setBusy(true)
    try {
      await syncCheckoutPayment(paymentId)
    } catch {
      /* best-effort */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 rounded-[14px] border border-fal-line bg-fal-surface p-4">
      <h2 className="m-0 text-lg font-extrabold text-fal-navy dark:text-fal-fg">
        {preferredPaymentType === 'debit_card' ? 'Cartão de débito' : 'Cartão de crédito'}
      </h2>
      <p className="m-0 text-sm text-fal-muted">
        Total {formatMoney(amount)}
        {conditionLine ? ` · ${conditionLine}` : null}
      </p>
      {preferredPaymentType === 'credit_card' && maxInstallments > 1 ? (
        <label className="block text-sm">
          Parcelas
          <select
            className="mt-1 w-full rounded-md border border-fal-line px-2 py-2"
            value={installments}
            onChange={(e) => setInstallments(Number(e.target.value))}
            disabled={Boolean(paymentUrl)}
          >
            {Array.from({ length: maxInstallments }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}x
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {!paymentUrl ? (
        <Button type="button" variant="primary" disabled={busy} onClick={() => void openPayment()}>
          {busy ? <Loading label="Preparando…" /> : 'Continuar pagamento com cartão'}
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="m-0 text-sm text-fal-muted">
            Abra a página de pagamento, conclua o cartão e volte aqui. Confirmamos automaticamente
            quando o pagamento for aprovado.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" disabled={busy} onClick={() => void openPayment()}>
              Abrir pagamento novamente
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void checkStatus()}>
              Já paguei — verificar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}