import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { usePaymentDisplay } from '@/hooks/usePaymentDisplay'
import { useCheckoutOrderPaymentWatch } from '@/hooks/useCheckoutOrderPaymentWatch'
import { falMaxInstallmentsForCheckout, formatPaymentConditionLine } from '@/lib/paymentDisplay'
import { formatMoney } from '@/lib/money'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  collectBrowserDeviceInfo,
  payAsaasCreditCard,
} from '@/services/payments/payAsaasCreditCardService'
import { syncCheckoutPayment } from '@/services/payments/paymentSyncService'
import { useMemo, useState, type FormEvent } from 'react'

export type EmbeddedCreditHolderDefaults = {
  name?: string | null
  email?: string | null
  cpfCnpj?: string | null
  postalCode?: string | null
  addressNumber?: string | null
  phone?: string | null
  address?: string | null
  province?: string | null
}

interface Props {
  orderId: string
  amount: number
  holderDefaults?: EmbeddedCreditHolderDefaults
  onApproved: (orderId: string) => void
  onError: (message: string) => void
}

function onlyDigits(v: string): string {
  return v.replace(/\D/g, '')
}

function maskCardNumber(raw: string): string {
  const d = onlyDigits(raw).slice(0, 19)
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

/**
 * Crédito no checkout (API Asaas). Não envia PAN a logs locais além do request TLS.
 * Débito continua em AsaasCardPanel (invoiceUrl).
 */
export function AsaasEmbeddedCreditPanel({
  orderId,
  amount,
  holderDefaults,
  onApproved,
  onError,
}: Props) {
  const paymentDisplay = usePaymentDisplay()
  const maxInstallments = falMaxInstallmentsForCheckout(amount, paymentDisplay)
  const [installments, setInstallments] = useState(1)
  const [busy, setBusy] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null)
  const [paidHint, setPaidHint] = useState(false)

  const [holderName, setHolderName] = useState(holderDefaults?.name?.trim() ?? '')
  const [cardNumber, setCardNumber] = useState('')
  const [expiryMonth, setExpiryMonth] = useState('')
  const [expiryYear, setExpiryYear] = useState('')
  const [ccv, setCcv] = useState('')

  const [holderEmail, setHolderEmail] = useState(holderDefaults?.email?.trim() ?? '')
  const [cpfCnpj, setCpfCnpj] = useState(onlyDigits(holderDefaults?.cpfCnpj ?? ''))
  const [postalCode, setPostalCode] = useState(onlyDigits(holderDefaults?.postalCode ?? ''))
  const [addressNumber, setAddressNumber] = useState(holderDefaults?.addressNumber?.trim() ?? '')
  const [phone, setPhone] = useState(onlyDigits(holderDefaults?.phone ?? ''))
  const [address, setAddress] = useState(holderDefaults?.address?.trim() ?? '')
  const [province, setProvince] = useState(holderDefaults?.province?.trim() ?? '')

  useCheckoutOrderPaymentWatch({
    orderId,
    enabled: Boolean(paymentId),
    paymentId,
    onSettled: onApproved,
  })

  const conditionLine = formatPaymentConditionLine(amount, paymentDisplay, 'pdp')
  const canSubmit = useMemo(() => amount >= 5 && !busy && !paidHint, [amount, busy, paidHint])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!(amount >= 5)) {
      onError('O valor mínimo para pagamento com cartão é R$ 5,00. Use Pix ou aumente o pedido.')
      return
    }
    setBusy(true)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const callbackUrl = origin ? `${origin}/checkout?asaas3ds=1` : undefined
      const res = await payAsaasCreditCard({
        orderId,
        installments: Math.min(maxInstallments, Math.max(1, installments)),
        creditCard: {
          holderName: holderName.trim(),
          number: onlyDigits(cardNumber),
          expiryMonth: onlyDigits(expiryMonth),
          expiryYear: onlyDigits(expiryYear),
          ccv: onlyDigits(ccv),
        },
        creditCardHolderInfo: {
          name: (holderDefaults?.name || holderName).trim(),
          email: holderEmail.trim(),
          cpfCnpj: onlyDigits(cpfCnpj),
          postalCode: onlyDigits(postalCode),
          addressNumber: addressNumber.trim(),
          phone: onlyDigits(phone),
          address: address.trim() || undefined,
          province: province.trim() || undefined,
        },
        deviceInfo: collectBrowserDeviceInfo(),
        callbackUrl,
      })

      setCardNumber('')
      setCcv('')
      setPaymentId(res.paymentId)

      if (res.orderApproved) {
        setPaidHint(true)
        onApproved(orderId)
        return
      }

      const challenge =
        res.threeDSecureChallengeUrl ||
        (res.paymentUrl && /3d|challenge|secure/i.test(res.paymentUrl) ? res.paymentUrl : null)
      if (challenge) {
        setChallengeUrl(challenge)
        window.open(challenge, '_blank', 'noopener,noreferrer')
      } else {
        setPaidHint(true)
      }
    } catch (err) {
      onError(toUserMessage(err, 'Não foi possível autorizar o cartão. Verifique os dados.'))
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
      <h2 className="m-0 text-lg font-extrabold text-fal-navy">Cartão de crédito</h2>
      <p className="m-0 text-sm text-fal-muted">
        Total {formatMoney(amount)}
        {conditionLine ? ` · ${conditionLine}` : null}
      </p>

      {paidHint && !challengeUrl ? (
        <div className="space-y-2">
          <p className="m-0 text-sm text-fal-muted">
            Pagamento enviado. Confirmamos automaticamente quando a operadora aprovar.
          </p>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void checkStatus()}>
            Já autorizei — verificar
          </Button>
        </div>
      ) : null}

      {challengeUrl ? (
        <div className="space-y-2">
          <p className="m-0 text-sm text-fal-muted">
            Conclua a verificação 3D Secure na janela aberta e volte aqui.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              disabled={busy}
              onClick={() => window.open(challengeUrl, '_blank', 'noopener,noreferrer')}
            >
              Abrir verificação novamente
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void checkStatus()}>
              Já verifiquei — confirmar
            </Button>
          </div>
        </div>
      ) : null}

      {!paidHint && !challengeUrl ? (
        <form className="space-y-3" onSubmit={(ev) => void onSubmit(ev)} autoComplete="off">
          {maxInstallments > 1 ? (
            <label className="block text-sm">
              Parcelas
              <select
                className="mt-1 w-full rounded-md border border-fal-line px-2 py-2"
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
                disabled={busy}
              >
                {Array.from({ length: maxInstallments }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}x
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <Input
            label="Nome no cartão"
            name="cc-name"
            autoComplete="cc-name"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            required
            disabled={busy}
          />
          <Input
            label="Número do cartão"
            name="cc-number"
            inputMode="numeric"
            autoComplete="cc-number"
            value={cardNumber}
            onChange={(e) => setCardNumber(maskCardNumber(e.target.value))}
            required
            disabled={busy}
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Mês"
              name="cc-exp-month"
              inputMode="numeric"
              autoComplete="cc-exp-month"
              placeholder="MM"
              value={expiryMonth}
              onChange={(e) => setExpiryMonth(onlyDigits(e.target.value).slice(0, 2))}
              required
              disabled={busy}
            />
            <Input
              label="Ano"
              name="cc-exp-year"
              inputMode="numeric"
              autoComplete="cc-exp-year"
              placeholder="AAAA"
              value={expiryYear}
              onChange={(e) => setExpiryYear(onlyDigits(e.target.value).slice(0, 4))}
              required
              disabled={busy}
            />
            <Input
              label="CVV"
              name="cc-csc"
              inputMode="numeric"
              autoComplete="cc-csc"
              value={ccv}
              onChange={(e) => setCcv(onlyDigits(e.target.value).slice(0, 4))}
              required
              disabled={busy}
            />
          </div>

          <p className="mb-0 mt-2 text-xs font-extrabold uppercase tracking-wide text-fal-muted">
            Titular (faturamento)
          </p>
          <Input
            label="E-mail"
            type="email"
            name="holder-email"
            value={holderEmail}
            onChange={(e) => setHolderEmail(e.target.value)}
            required
            disabled={busy}
          />
          <Input
            label="CPF/CNPJ"
            name="holder-doc"
            inputMode="numeric"
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(onlyDigits(e.target.value).slice(0, 14))}
            required
            disabled={busy}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="CEP"
              name="holder-cep"
              inputMode="numeric"
              value={postalCode}
              onChange={(e) => setPostalCode(onlyDigits(e.target.value).slice(0, 8))}
              required
              disabled={busy}
            />
            <Input
              label="Número"
              name="holder-number"
              value={addressNumber}
              onChange={(e) => setAddressNumber(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          <Input
            label="Telefone"
            name="holder-phone"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(onlyDigits(e.target.value).slice(0, 11))}
            required
            disabled={busy}
          />
          <Input
            label="Endereço (opcional)"
            name="holder-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={busy}
          />
          <Input
            label="Bairro (opcional)"
            name="holder-province"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            disabled={busy}
          />

          <Button type="submit" variant="primary" disabled={!canSubmit}>
            {busy ? <Loading label="Autorizando…" /> : 'Pagar com cartão'}
          </Button>
          <p className="mb-0 text-xs text-fal-muted">
            Seus dados de cartão são enviados de forma segura ao provedor. Não armazenamos o número
            completo.
          </p>
        </form>
      ) : null}
    </div>
  )
}
