import { Input } from '@/components/common/Input'
import { applyPaymentCondition, type PaymentConditionMethod } from '@/lib/paymentDisplay'
import { formatMoney } from '@/lib/money'

export type AdjustKind = 'none' | 'discount' | 'increase'

/** Converte valor assinado persistido → UI (tipo + magnitude positiva). */
export function signedPercentToKind(signed: number): { kind: AdjustKind; magnitude: number } {
  const n = Number(signed)
  if (!Number.isFinite(n) || n === 0) return { kind: 'none', magnitude: 0 }
  if (n < 0) return { kind: 'discount', magnitude: Math.min(90, Math.abs(n)) }
  return { kind: 'increase', magnitude: Math.min(100, n) }
}

/** UI → valor assinado para gravar (− desconto, + aumento). */
export function kindToSignedPercent(kind: AdjustKind, magnitude: number): number {
  const mag = Math.min(
    kind === 'discount' ? 90 : 100,
    Math.max(0, Math.round(Number(magnitude) * 1000) / 1000 || 0),
  )
  if (kind === 'none' || mag === 0) return 0
  return kind === 'discount' ? -mag : mag
}

type Props = {
  label?: string
  signedPercent: number
  disabled?: boolean
  methodLabel: string
  method: PaymentConditionMethod
  sampleBase?: number
  samplePromo?: number
  onChange: (signedPercent: number) => void
}

/**
 * Controle intuitivo: sem ajuste | desconto % | aumento % (sem digitar negativo).
 */
export function PaymentAdjustPercentControl({
  label = 'Condição sobre o preço da lista',
  signedPercent,
  disabled,
  methodLabel,
  method,
  sampleBase = 100,
  samplePromo = 80,
  onChange,
}: Props) {
  const { kind, magnitude } = signedPercentToKind(signedPercent)
  // Só o % do meio importa para a prévia.
  const settingsStub = {
    id: 'preview',
    enabled: true,
    maxInstallments: 1,
    minInstallmentAmount: 0,
    interestFree: false,
    interestFreeMax: 0,
    allowInterestInstallments: false,
    installmentsEnabled: false,
    cardEnabled: true,
    creditEnabled: true,
    debitEnabled: true,
    pixEnabled: true,
    showOnCards: false,
    showOnPdp: false,
    footnote: null,
    pixAdjustPercent: method === 'pix' ? signedPercent : 0,
    debitAdjustPercent: method === 'debit_card' ? signedPercent : 0,
    creditAdjustPercent: method === 'credit_card' ? signedPercent : 0,
  }
  const atBase = applyPaymentCondition(sampleBase, method, settingsStub)
  const atPromo = applyPaymentCondition(samplePromo, method, settingsStub)

  const summary =
    kind === 'none'
      ? `${methodLabel} = preço da lista (sem alteração)`
      : kind === 'discount'
        ? `Desconto de ${magnitude}% no ${methodLabel}`
        : `Aumento de ${magnitude}% no ${methodLabel}`

  function setKind(next: AdjustKind) {
    if (next === 'none') {
      onChange(0)
      return
    }
    const mag = magnitude > 0 ? magnitude : next === 'discount' ? 5 : 2
    onChange(kindToSignedPercent(next, mag))
  }

  function setMagnitude(raw: string) {
    const mag = Number(raw)
    if (!Number.isFinite(mag)) {
      onChange(kindToSignedPercent(kind === 'none' ? 'discount' : kind, 0))
      return
    }
    const effectiveKind = kind === 'none' ? (mag > 0 ? 'discount' : 'none') : kind
    onChange(kindToSignedPercent(effectiveKind === 'none' ? 'discount' : effectiveKind, mag))
  }

  return (
    <fieldset
      className="m-0 space-y-3 rounded-[12px] border border-fal-line bg-fal-bg/30 p-3"
      disabled={disabled}
    >
      <legend className="px-1 text-sm font-bold text-fal-navy">{label}</legend>
      <p className="m-0 text-xs text-fal-muted">
        Aplica-se ao preço já resolvido (lista padrão ou promocional). Não cria outra lista.
      </p>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de ajuste">
        {(
          [
            { id: 'none' as const, text: 'Sem ajuste' },
            { id: 'discount' as const, text: 'Desconto' },
            { id: 'increase' as const, text: 'Aumento' },
          ] as const
        ).map((opt) => {
          const active = kind === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => setKind(opt.id)}
              className={[
                'rounded-[10px] border px-3 py-2 text-sm font-bold transition',
                active
                  ? opt.id === 'discount'
                    ? 'border-emerald-700 bg-emerald-100 text-emerald-950'
                    : opt.id === 'increase'
                      ? 'border-amber-700 bg-amber-100 text-amber-950'
                      : 'border-fal-navy bg-fal-navy text-white'
                  : 'border-fal-line bg-white text-fal-navy hover:bg-fal-bg',
              ].join(' ')}
            >
              {opt.text}
            </button>
          )
        })}
      </div>

      {kind !== 'none' ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[140px] flex-1">
            <Input
              label={kind === 'discount' ? 'Percentual de desconto' : 'Percentual de aumento'}
              type="number"
              min={0}
              max={kind === 'discount' ? 90 : 100}
              step="0.1"
              value={String(magnitude)}
              disabled={disabled}
              onChange={(e) => setMagnitude(e.target.value)}
            />
          </div>
          <p className="mb-3 text-sm font-extrabold text-fal-navy">%</p>
        </div>
      ) : null}

      <p
        className={`m-0 rounded-lg px-3 py-2 text-sm font-semibold ${
          kind === 'discount'
            ? 'bg-emerald-50 text-emerald-950'
            : kind === 'increase'
              ? 'bg-amber-50 text-amber-950'
              : 'bg-white text-fal-navy'
        }`}
      >
        {summary}
      </p>

      <div className="rounded-lg bg-white px-3 py-2 text-sm text-fal-navy">
        <p className="m-0 font-bold">Prévia</p>
        <p className="mb-0 mt-1">
          Lista padrão {formatMoney(sampleBase)} → {methodLabel}{' '}
          <strong>{formatMoney(atBase.amount)}</strong>
          {atBase.adjustmentAmount !== 0
            ? ` (${atBase.adjustmentAmount > 0 ? '+' : ''}${formatMoney(atBase.adjustmentAmount)})`
            : ''}
        </p>
        <p className="mb-0 mt-1 text-fal-muted">
          Lista promo {formatMoney(samplePromo)} → {methodLabel}{' '}
          <strong>{formatMoney(atPromo.amount)}</strong> (mesma %)
        </p>
      </div>
    </fieldset>
  )
}
