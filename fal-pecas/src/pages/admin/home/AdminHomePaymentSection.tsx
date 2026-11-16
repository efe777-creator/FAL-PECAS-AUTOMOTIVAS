import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { PaymentAdjustPercentControl } from '@/components/admin/PaymentAdjustPercentControl'
import {
  applyPaymentCondition,
  formatPaymentConditionLine,
  formatPixConditionLine,
  type PaymentDisplaySettings,
} from '@/lib/paymentDisplay'
import { formatMoney } from '@/lib/money'
import { resolveEffectivePaymentAvailability } from '@/services/payments/effectivePaymentAvailability'
import { usePaymentRoutingConfig } from '@/hooks/usePaymentRoutingConfig'
import { Link } from 'react-router-dom'
import { type FormEvent } from 'react'

export type PaymentMeioTab = 'pix' | 'debit' | 'credit' | 'boleto'

type Props = {
  payment: Omit<PaymentDisplaySettings, 'id'> & { id?: string }
  setPayment: (
    updater: (
      p: Omit<PaymentDisplaySettings, 'id'> & { id?: string },
    ) => Omit<PaymentDisplaySettings, 'id'> & { id?: string },
  ) => void
  setDirtyPayment: (dirty: boolean) => void
  savingPayment: boolean
  onSave: (e: FormEvent) => void
  meio: PaymentMeioTab
  onMeioChange: (m: PaymentMeioTab) => void
}

function Chip({
  label,
  state,
}: {
  label: string
  state: 'on' | 'off' | 'warn'
}) {
  const cls =
    state === 'on'
      ? 'bg-emerald-100 text-emerald-900'
      : state === 'warn'
        ? 'bg-amber-100 text-amber-950'
        : 'bg-fal-line/60 text-fal-muted'
  const text = state === 'on' ? 'visível' : state === 'warn' ? 'bloqueado' : 'oculto'
  return (
    <span className={`rounded-md px-2 py-1 text-xs font-bold ${cls}`}>
      {label}: {text}
    </span>
  )
}

export function AdminHomePaymentSection({
  payment,
  setPayment,
  setDirtyPayment,
  savingPayment,
  onSave,
  meio,
  onMeioChange,
}: Props) {
  const routing = usePaymentRoutingConfig()
  const settingsFull = { ...payment, id: payment.id ?? 'x' } as PaymentDisplaySettings
  const avail = resolveEffectivePaymentAvailability(settingsFull, routing)

  const pixCommercial = payment.pixEnabled
  const creditCommercial = payment.creditEnabled
  const debitCommercial = payment.debitEnabled

  const pixChip: 'on' | 'off' | 'warn' = !pixCommercial
    ? 'off'
    : avail.pix
      ? 'on'
      : 'warn'
  const creditChip: 'on' | 'off' | 'warn' = !creditCommercial
    ? 'off'
    : avail.credit
      ? 'on'
      : 'warn'
  const debitChip: 'on' | 'off' | 'warn' = !debitCommercial
    ? 'off'
    : avail.debit
      ? 'on'
      : 'warn'

  const sampleBase = 100
  const samplePromo = 80
  const creditAtBase = applyPaymentCondition(sampleBase, 'credit_card', settingsFull)
  const creditLine = formatPaymentConditionLine(sampleBase, settingsFull, 'card')
  const pixLine = formatPixConditionLine(sampleBase, settingsFull)

  const meios: { id: PaymentMeioTab; label: string }[] = [
    { id: 'pix', label: 'Pix' },
    { id: 'debit', label: 'Débito' },
    { id: 'credit', label: 'Crédito' },
    { id: 'boleto', label: 'Boleto' },
  ]

  function mark(
    patch: Partial<Omit<PaymentDisplaySettings, 'id'>>,
  ) {
    setDirtyPayment(true)
    setPayment((p) => ({ ...p, ...patch }))
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="m-0 text-lg font-bold text-fal-navy">Pagamentos da loja</h2>
        <p className="mb-0 mt-1 text-sm text-fal-muted">
          Condições em cima do preço da lista (padrão ou promocional, conforme Promoções).
          Integração técnica:{' '}
          <Link to="/admin/pagamentos" className="font-semibold text-fal-navy">
            Admin → Pagamentos
          </Link>
          .
        </p>
        <p className="mb-0 mt-2 flex flex-wrap gap-3 text-sm">
          <Link to="/admin/precos" className="font-semibold text-fal-navy">
            Listas de preços
          </Link>
          <Link to="/admin/home/promocoes" className="font-semibold text-fal-navy">
            Promoções
          </Link>
          <Link to="/admin/pagamentos" className="font-semibold text-fal-navy">
            Integração
          </Link>
        </p>
      </div>

      <div className="rounded-[14px] border border-fal-line bg-white p-4">
        <p className="m-0 text-sm font-bold text-fal-navy">Situação na loja agora</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip label="Pix" state={pixChip} />
          <Chip label="Débito" state={debitChip} />
          <Chip label="Crédito" state={creditChip} />
          <Chip label="Boleto" state="off" />
        </div>
        {avail.cardBlockedReason ||
        pixChip === 'warn' ||
        creditChip === 'warn' ||
        debitChip === 'warn' ? (
          <p className="mb-0 mt-2 text-xs text-amber-900">
            {avail.cardBlockedReason ||
              'Meio ligado na loja, mas a integração/roteamento impede a exibição.'}{' '}
            <Link to="/admin/pagamentos/metodos" className="font-semibold underline">
              Abrir integração
            </Link>
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Meios de pagamento">
        {meios.map((m) => (
          <Button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={meio === m.id}
            variant={meio === m.id ? 'primary' : 'outline'}
            onClick={() => onMeioChange(m.id)}
          >
            {m.label}
          </Button>
        ))}
      </div>

      <form
        onSubmit={onSave}
        className="max-w-xl space-y-4 rounded-fal border border-fal-line bg-white p-4"
      >
        {meio === 'pix' ? (
          <>
            <label className="flex items-center gap-2 text-sm font-semibold text-fal-navy">
              <input
                type="checkbox"
                checked={payment.pixEnabled}
                onChange={(e) => mark({ pixEnabled: e.target.checked })}
              />
              Disponibilizar Pix na loja
            </label>
            <p className="m-0 text-xs text-fal-muted">À vista no checkout e na vitrine.</p>
            <PaymentAdjustPercentControl
              method="pix"
              methodLabel="Pix"
              signedPercent={payment.pixAdjustPercent}
              disabled={!payment.pixEnabled}
              sampleBase={sampleBase}
              samplePromo={samplePromo}
              onChange={(pixAdjustPercent) => mark({ pixAdjustPercent })}
            />
          </>
        ) : null}

        {meio === 'debit' ? (
          <>
            <label className="flex items-center gap-2 text-sm font-semibold text-fal-navy">
              <input
                type="checkbox"
                checked={payment.debitEnabled}
                onChange={(e) => {
                  const debitEnabled = e.target.checked
                  mark({
                    debitEnabled,
                    cardEnabled: payment.creditEnabled || debitEnabled,
                  })
                }}
              />
              Disponibilizar débito na loja
            </label>
            <p className="m-0 text-xs text-fal-muted">À vista · 1x. Sem parcelamento.</p>
            <PaymentAdjustPercentControl
              method="debit_card"
              methodLabel="Débito"
              signedPercent={payment.debitAdjustPercent}
              disabled={!payment.debitEnabled}
              sampleBase={sampleBase}
              samplePromo={samplePromo}
              onChange={(debitAdjustPercent) => mark({ debitAdjustPercent })}
            />
          </>
        ) : null}

        {meio === 'credit' ? (
          <>
            <label className="flex items-center gap-2 text-sm font-semibold text-fal-navy">
              <input
                type="checkbox"
                checked={payment.creditEnabled}
                onChange={(e) => {
                  const creditEnabled = e.target.checked
                  mark({
                    creditEnabled,
                    cardEnabled: creditEnabled || payment.debitEnabled,
                  })
                }}
              />
              Disponibilizar crédito na loja
            </label>
            <PaymentAdjustPercentControl
              method="credit_card"
              methodLabel="Crédito"
              signedPercent={payment.creditAdjustPercent}
              disabled={!payment.creditEnabled}
              sampleBase={sampleBase}
              samplePromo={samplePromo}
              onChange={(creditAdjustPercent) => mark({ creditAdjustPercent })}
            />
            <fieldset className="m-0 space-y-3 border-0 p-0">
              <legend className="mb-1 text-sm font-bold text-fal-navy">Parcelamento</legend>
              <label className="flex items-center gap-2 text-sm font-semibold text-fal-navy">
                <input
                  type="checkbox"
                  checked={payment.installmentsEnabled}
                  disabled={!payment.creditEnabled}
                  onChange={(e) => mark({ installmentsEnabled: e.target.checked })}
                />
                Ativar parcelamento (senão só 1x)
              </label>
              <Input
                label="Máximo de parcelas"
                type="number"
                min={1}
                max={24}
                disabled={!payment.creditEnabled || !payment.installmentsEnabled}
                value={String(payment.maxInstallments)}
                onChange={(e) => {
                  const maxInstallments = Number(e.target.value) || 1
                  mark({
                    maxInstallments,
                    interestFreeMax: Math.min(payment.interestFreeMax, maxInstallments),
                  })
                }}
              />
              <Input
                label="Parcelas sem juros (até)"
                type="number"
                min={0}
                max={24}
                disabled={!payment.creditEnabled || !payment.installmentsEnabled}
                value={String(payment.interestFreeMax)}
                onChange={(e) => {
                  const interestFreeMax = Math.max(0, Number(e.target.value) || 0)
                  mark({ interestFreeMax, interestFree: interestFreeMax > 0 })
                }}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={payment.allowInterestInstallments}
                  disabled={!payment.creditEnabled || !payment.installmentsEnabled}
                  onChange={(e) => mark({ allowInterestInstallments: e.target.checked })}
                />
                Permitir parcelas com juros (gateway)
              </label>
              <Input
                label="Valor mínimo por parcela (R$)"
                type="number"
                min={0}
                step="0.01"
                disabled={!payment.creditEnabled || !payment.installmentsEnabled}
                value={String(payment.minInstallmentAmount)}
                onChange={(e) => mark({ minInstallmentAmount: Number(e.target.value) || 0 })}
              />
            </fieldset>
            <fieldset className="m-0 space-y-2 border-0 p-0">
              <legend className="mb-1 text-sm font-bold text-fal-navy">Exibição na vitrine</legend>
              <label className="flex items-center gap-2 text-sm font-semibold text-fal-navy">
                <input
                  type="checkbox"
                  checked={payment.enabled}
                  disabled={!payment.creditEnabled}
                  onChange={(e) => mark({ enabled: e.target.checked })}
                />
                Mostrar condição de parcelas na loja
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={payment.showOnCards}
                  disabled={!payment.creditEnabled}
                  onChange={(e) => mark({ showOnCards: e.target.checked })}
                />
                Nos cards
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={payment.showOnPdp}
                  disabled={!payment.creditEnabled}
                  onChange={(e) => mark({ showOnPdp: e.target.checked })}
                />
                Na página do produto
              </label>
              <Input
                label="Rodapé (só PDP, opcional)"
                value={payment.footnote ?? ''}
                disabled={!payment.creditEnabled}
                onChange={(e) => mark({ footnote: e.target.value })}
                placeholder="Ex.: sujeito à análise do cartão"
              />
            </fieldset>
            <p className="m-0 rounded-lg bg-fal-bg px-3 py-2 text-sm">
              Prévia card: {formatMoney(creditAtBase.amount)}
              {creditLine ? ` · ${creditLine}` : ''}
              {pixLine ? (
                <>
                  <br />
                  {pixLine}
                </>
              ) : null}
            </p>
          </>
        ) : null}

        {meio === 'boleto' ? (
          <div className="space-y-2">
            <p className="m-0 text-sm font-semibold text-fal-navy">Boleto</p>
            <p className="m-0 text-sm text-fal-muted">
              Em breve. Não há campos graváveis neste ciclo — o meio permanece indisponível no
              checkout.
            </p>
          </div>
        ) : null}

        {meio !== 'boleto' ? (
          <Button type="submit" variant="primary" disabled={savingPayment}>
            {savingPayment ? 'Salvando…' : `Salvar condições de ${meios.find((m) => m.id === meio)?.label}`}
          </Button>
        ) : null}
      </form>
    </div>
  )
}

export function parsePaymentMeio(raw: string | null | undefined): PaymentMeioTab {
  if (raw === 'debit' || raw === 'credit' || raw === 'boleto' || raw === 'pix') return raw
  return 'pix'
}
