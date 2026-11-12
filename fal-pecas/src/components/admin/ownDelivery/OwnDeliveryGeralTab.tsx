import { ensureOwnRateId } from '@/components/admin/ownDelivery/ownDeliveryHelpers'
import { LogisticsDeadlinePanel } from '@/components/admin/logistics/LogisticsDeadlinePanel'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import type { OwnDeliveryCepRange, OwnDeliveryRate } from '@/services/admin/adminOwnDeliveryService'
import type { OwnPricingMode } from '@/types'
import type { FormEvent } from 'react'

export type OwnDeliveryGeralValues = {
  enabled: boolean
  coverageLabel: string
  cepRanges: OwnDeliveryCepRange[]
  rates: OwnDeliveryRate[]
  pricingMode: OwnPricingMode
  maxDistanceKm: string
  etaDaysMin: number
  etaDaysMax: number
  /** Tempo a mais FAL sobre o prazo base. */
  etaExtraDays: number
  etaDayCountMode: 'business_days' | 'calendar_days'
  showTech: boolean
}

type Props = {
  values: OwnDeliveryGeralValues
  saving: boolean
  onChange: (patch: Partial<OwnDeliveryGeralValues>) => void
  onSubmit: (e: FormEvent) => void
}

export function OwnDeliveryGeralTab({ values, saving, onChange, onSubmit }: Props) {
  const {
    enabled,
    coverageLabel,
    cepRanges,
    rates,
    pricingMode,
    maxDistanceKm,
    etaDaysMin,
    etaDaysMax,
    etaExtraDays,
    etaDayCountMode,
    showTech,
  } = values

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-[14px] border border-fal-line bg-white p-4"
    >
      <h2 className="m-0 text-lg font-extrabold text-fal-navy">Configurações gerais</h2>
      <label className="flex items-center gap-2 text-sm font-semibold text-fal-navy">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
        />
        Ativar frete próprio na cotação da loja
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-fal-navy">Como calcular o frete</span>
        <select
          className="w-full rounded-lg border border-fal-line px-3 py-2"
          value={pricingMode}
          onChange={(e) => onChange({ pricingMode: e.target.value as OwnPricingMode })}
        >
          <option value="flat">Preço fixo (mesmo valor para a região)</option>
          <option value="distance_vehicle">Por distância e tipo de veículo (recomendado)</option>
        </select>
        <span className="mt-1 block text-xs text-fal-muted">
          {pricingMode === 'distance_vehicle'
            ? 'Usa os menus Veículos e Tarifas. Cobra o maior entre (km × valor/km) e a taxa mínima, depois soma o adicional.'
            : 'Um valor único por opção de entrega, sem calcular km.'}
        </span>
      </label>
      <Input
        label="Nome da cobertura"
        value={coverageLabel}
        onChange={(e) => onChange({ coverageLabel: e.target.value })}
        required
      />
      <Input
        label="Km máximo global (opcional)"
        type="number"
        min="0"
        step="0.1"
        value={maxDistanceKm}
        onChange={(e) => onChange({ maxDistanceKm: e.target.value })}
        hint="Limite geral. Cada veículo pode ter km próprio no menu Veículos."
      />
      <LogisticsDeadlinePanel
        mode="own"
        baseMin={etaDaysMin}
        baseMax={etaDaysMax}
        extraDays={etaExtraDays}
        dayCountMode={etaDayCountMode}
        showSaveButton={false}
        onBaseMin={(n) => onChange({ etaDaysMin: n })}
        onBaseMax={(n) => onChange({ etaDaysMax: Math.max(n, etaDaysMin) })}
        onExtraDays={(n) => onChange({ etaExtraDays: n })}
        onDayCountMode={(m) => onChange({ etaDayCountMode: m })}
      />
      <div className="space-y-2">
        <h3 className="m-0 text-sm font-extrabold text-fal-navy">Faixas de CEP atendidas</h3>
        {cepRanges.map((r, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <Input
              label="De"
              value={r.from}
              onChange={(e) => {
                const next = [...cepRanges]
                next[i] = { ...next[i], from: e.target.value }
                onChange({ cepRanges: next })
              }}
            />
            <Input
              label="Até"
              value={r.to}
              onChange={(e) => {
                const next = [...cepRanges]
                next[i] = { ...next[i], to: e.target.value }
                onChange({ cepRanges: next })
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange({ cepRanges: cepRanges.filter((_, j) => j !== i) })}
            >
              Remover
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange({ cepRanges: [...cepRanges, { from: '', to: '' }] })}
        >
          + Faixa de CEP
        </Button>
      </div>
      {pricingMode === 'flat' ? (
        <div className="space-y-2 rounded-lg border border-dashed border-fal-line p-3">
          <h3 className="m-0 text-sm font-extrabold text-fal-navy">Opções de preço fixo</h3>
          <p className="m-0 text-xs text-fal-muted">
            Nome que o cliente vê na cotação e o valor cobrado. Identificadores internos são gerados
            automaticamente.
          </p>
          {rates.map((rate, i) => (
            <div key={rate.id || i} className="grid gap-2 sm:grid-cols-2">
              <Input
                label="Nome na loja"
                value={rate.label}
                onChange={(e) => {
                  const next = [...rates]
                  next[i] = { ...next[i], label: e.target.value }
                  onChange({ rates: next })
                }}
                required
              />
              <Input
                label="Valor (R$)"
                type="number"
                step="0.01"
                min="0"
                value={String(rate.amount)}
                onChange={(e) => {
                  const next = [...rates]
                  next[i] = { ...next[i], amount: Number(e.target.value) }
                  onChange({ rates: next })
                }}
                required
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onChange({
                rates: [
                  ...rates,
                  {
                    id: ensureOwnRateId(`opcao_${rates.length + 1}`),
                    serviceCode: 'fal_sp',
                    label: '',
                    amount: 0,
                    etaDaysMin,
                    etaDaysMax,
                  },
                ],
              })
            }
          >
            + Opção de preço
          </Button>
          {showTech ? (
            <div className="rounded-lg bg-fal-line/30 p-2 text-xs text-fal-muted">
              <p className="m-0 mb-1 font-semibold text-fal-navy">Identificadores (interno)</p>
              {rates.map((r, i) => (
                <p key={i} className="m-0 font-mono">
                  {ensureOwnRateId(r.label || `opcao_${i + 1}`, r.id)}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="m-0 rounded-lg bg-fal-line/40 px-3 py-2 text-sm text-fal-muted">
          Com cálculo por distância, defina os tipos em <strong>Veículos</strong> e os preços em{' '}
          <strong>Tarifas</strong>.
        </p>
      )}
      <label className="flex items-center gap-2 text-xs text-fal-muted">
        <input
          type="checkbox"
          checked={showTech}
          onChange={(e) => onChange({ showTech: e.target.checked })}
        />
        Mostrar detalhes técnicos
      </label>
      <Button type="submit" disabled={saving}>
        {saving ? 'Salvando…' : 'Salvar gerais'}
      </Button>
    </form>
  )
}
