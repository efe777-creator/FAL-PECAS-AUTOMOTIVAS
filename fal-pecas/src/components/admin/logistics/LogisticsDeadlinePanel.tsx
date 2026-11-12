import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { computeMeDisplayEta, computeOwnDisplayEta } from '@/lib/shippingEtaPolicy'
import type { MeQuoteEtaSample } from '@/services/admin/adminShippingEtaPolicyService'

type MeProps = {
  mode: 'me'
  extraDays: number
  dayCountMode: 'business_days' | 'calendar_days'
  samples?: MeQuoteEtaSample[]
  saving?: boolean
  onExtraDays: (n: number) => void
  onDayCountMode?: (m: 'business_days' | 'calendar_days') => void
  onSave: () => void
}

type OwnProps = {
  mode: 'own'
  baseMin: number
  baseMax: number
  extraDays: number
  dayCountMode: 'business_days' | 'calendar_days'
  saving?: boolean
  onBaseMin: (n: number) => void
  onBaseMax: (n: number) => void
  onExtraDays: (n: number) => void
  onDayCountMode?: (m: 'business_days' | 'calendar_days') => void
  onSave?: () => void
  /** Se false, só edita campos (save fica no form pai). */
  showSaveButton?: boolean
}

export function LogisticsDeadlinePanel(props: MeProps | OwnProps) {
  const daysLabel =
    (props.mode === 'me' ? props.dayCountMode : props.dayCountMode) === 'business_days'
      ? 'dias úteis'
      : 'dias corridos'

  if (props.mode === 'me') {
    const preview = computeMeDisplayEta(
      { min: 3, max: 5 },
      {
        dayCountMode: props.dayCountMode,
        me: {
          extraDays: props.extraDays,
          prepDays: 0,
          bufferDays: props.extraDays,
          prepIncludedInCarrier: true,
        },
      },
    )
    return (
      <section className="rounded-[14px] border border-fal-line bg-white p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="m-0 text-base font-extrabold text-fal-navy">Prazos Melhor Envio</h2>
          <p className="mb-0 mt-1 text-sm text-fal-muted">
            O <strong>prazo real</strong> vem da transportadora em cada cotação. Aqui você só
            controla o <strong>tempo a mais</strong> da FAL. Pedidos antigos não mudam.
          </p>
        </div>

        {props.samples && props.samples.length > 0 ? (
          <div className="rounded-[10px] border border-fal-line bg-fal-bg/50 px-3 py-2">
            <p className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
              Prazo real (última cotação)
            </p>
            <ul className="mb-0 mt-2 space-y-1 text-sm">
              {props.samples.map((s) => {
                const shown = computeMeDisplayEta(
                  { min: s.carrierMin, max: s.carrierMax },
                  {
                    dayCountMode: props.dayCountMode,
                    me: {
                      extraDays: props.extraDays,
                      prepDays: 0,
                      bufferDays: props.extraDays,
                      prepIncludedInCarrier: true,
                    },
                  },
                )
                return (
                  <li key={s.serviceId} className="text-fal-navy">
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-fal-muted">
                      {' '}
                      · real {s.carrierMin}–{s.carrierMax} {daysLabel} · cliente vê{' '}
                      {shown.displayEtaMin}–{shown.displayEtaMax}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <p className="m-0 text-xs text-fal-muted">
            Ainda não há cotação ME recente para listar prazos reais por serviço. Após a primeira
            cotação na loja, os mínimos reais aparecem aqui.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
          <Input
            label="Tempo a mais FAL (dias)"
            type="number"
            min={0}
            value={String(props.extraDays)}
            onChange={(e) => props.onExtraDays(Math.max(0, Number(e.target.value) || 0))}
            hint="Somado ao prazo real da transportadora."
          />
          {props.onDayCountMode ? (
            <label className="block text-sm font-semibold text-fal-navy">
              Contagem
              <select
                className="mt-1 w-full rounded-[10px] border border-fal-line px-3 py-2"
                value={props.dayCountMode}
                onChange={(e) =>
                  props.onDayCountMode?.(
                    e.target.value as 'business_days' | 'calendar_days',
                  )
                }
              >
                <option value="business_days">Dias úteis</option>
                <option value="calendar_days">Dias corridos</option>
              </select>
            </label>
          ) : null}
        </div>

        <p className="m-0 rounded-[10px] bg-fal-bg px-3 py-2 text-xs text-fal-muted">
          Exemplo: transportadora 3–5 → cliente vê{' '}
          <strong>
            {preview.displayEtaMin}–{preview.displayEtaMax}
          </strong>{' '}
          {daysLabel} (extra {props.extraDays}).
        </p>

        <Button type="button" disabled={props.saving} onClick={() => props.onSave()}>
          {props.saving ? 'Salvando…' : 'Salvar prazo Melhor Envio'}
        </Button>
      </section>
    )
  }

  const ownPreview = computeOwnDisplayEta(
    { min: props.baseMin, max: props.baseMax },
    {
      own: {
        dayCountMode: props.dayCountMode,
        extraDays: props.extraDays,
      },
    },
  )

  return (
    <section className="rounded-[14px] border border-fal-line bg-white p-4 space-y-3">
      <div>
        <h3 className="m-0 text-sm font-extrabold text-fal-navy">Prazos frete próprio</h3>
        <p className="mb-0 mt-1 text-xs text-fal-muted">
          <strong>Prazo base</strong> = tempo operacional FAL da modalidade. Depois some o{' '}
          <strong>tempo a mais</strong> se precisar. Cliente vê base + extra.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="Prazo base mínimo"
          type="number"
          min={0}
          value={String(props.baseMin)}
          onChange={(e) => props.onBaseMin(Math.max(0, Number(e.target.value) || 0))}
        />
        <Input
          label="Prazo base máximo"
          type="number"
          min={0}
          value={String(props.baseMax)}
          onChange={(e) => props.onBaseMax(Math.max(0, Number(e.target.value) || 0))}
        />
        <Input
          label="Tempo a mais (dias)"
          type="number"
          min={0}
          value={String(props.extraDays)}
          onChange={(e) => props.onExtraDays(Math.max(0, Number(e.target.value) || 0))}
          hint="Somado ao prazo base."
        />
      </div>
      {props.onDayCountMode ? (
        <label className="block text-sm font-semibold text-fal-navy max-w-xs">
          Contagem
          <select
            className="mt-1 w-full rounded-[10px] border border-fal-line px-3 py-2"
            value={props.dayCountMode}
            onChange={(e) =>
              props.onDayCountMode?.(e.target.value as 'business_days' | 'calendar_days')
            }
          >
            <option value="business_days">Dias úteis</option>
            <option value="calendar_days">Dias corridos</option>
          </select>
        </label>
      ) : null}
      <p className="m-0 text-xs text-fal-muted">
        Cliente vê{' '}
        <strong>
          {ownPreview.displayEtaMin}–{ownPreview.displayEtaMax}
        </strong>{' '}
        {daysLabel} (base {props.baseMin}–{props.baseMax} + extra {props.extraDays}).
      </p>
      {props.showSaveButton !== false && props.onSave ? (
        <Button type="button" disabled={props.saving} onClick={() => props.onSave?.()}>
          {props.saving ? 'Salvando…' : 'Salvar prazos own'}
        </Button>
      ) : null}
    </section>
  )
}
