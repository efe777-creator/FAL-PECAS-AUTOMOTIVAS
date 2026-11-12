/**
 * Controle de prazos — Logística FAL.
 *
 * ME:  prazo exibido = prazo real da transportadora (cotação) + tempo extra FAL
 * Own: prazo exibido = prazo base operacional FAL + tempo extra FAL
 * Nunca soma o mesmo tempo duas vezes.
 */

export type DayCountMode = 'business_days' | 'calendar_days'

export type ShippingEtaPolicy = {
  dayCountMode: DayCountMode
  me: {
    /** Tempo a mais (dias) sobre o prazo real do Melhor Envio. */
    extraDays: number
    /** @deprecated use extraDays — mantido só para migração de dados antigos */
    prepDays: number
    bufferDays: number
    prepIncludedInCarrier: boolean
  }
  own: {
    dayCountMode: DayCountMode
    /** Tempo a mais (dias) sobre o prazo base do frete próprio. */
    extraDays: number
  }
  mock: {
    economicMin: number
    economicMax: number
    expressMin: number
    expressMax: number
  }
  pickup: {
    availableInDaysMin: number
    availableInDaysMax: number
  }
}

export const DEFAULT_SHIPPING_ETA_POLICY: ShippingEtaPolicy = {
  dayCountMode: 'business_days',
  me: {
    extraDays: 0,
    prepDays: 0,
    bufferDays: 0,
    prepIncludedInCarrier: true,
  },
  own: {
    dayCountMode: 'business_days',
    extraDays: 0,
  },
  mock: {
    economicMin: 5,
    economicMax: 8,
    expressMin: 2,
    expressMax: 4,
  },
  pickup: {
    availableInDaysMin: 0,
    availableInDaysMax: 1,
  },
}

export type EtaRange = { min: number; max: number }

export type DisplayEtaResult = {
  /** Prazo real da escolha (carrier ou base own) — não editável pelo “extra”. */
  baseEtaMin: number
  baseEtaMax: number
  extraDaysApplied: number
  displayEtaMin: number
  displayEtaMax: number
  dayCountMode: DayCountMode
}

/** Compat: carrierEta* aliases */
export type MeDisplayEtaResult = DisplayEtaResult & {
  carrierEtaMin: number
  carrierEtaMax: number
}

/**
 * ME: prazo exibido = prazo real do serviço (transportadora) + tempo extra FAL.
 */
export function computeMeDisplayEta(
  carrier: EtaRange,
  policy: Pick<ShippingEtaPolicy, 'dayCountMode' | 'me'>,
): MeDisplayEtaResult {
  const extra = resolveMeExtraDays(policy.me)
  const cMin = Math.max(0, carrier.min)
  const cMax = Math.max(cMin, carrier.max)
  return {
    baseEtaMin: cMin,
    baseEtaMax: cMax,
    carrierEtaMin: cMin,
    carrierEtaMax: cMax,
    extraDaysApplied: extra,
    displayEtaMin: cMin + extra,
    displayEtaMax: cMax + extra,
    dayCountMode: policy.dayCountMode,
  }
}

/**
 * Own: prazo exibido = prazo base (settings) + tempo extra FAL.
 */
export function computeOwnDisplayEta(
  base: EtaRange,
  policy: Pick<ShippingEtaPolicy, 'own'>,
): DisplayEtaResult {
  const extra = Math.max(0, policy.own.extraDays)
  const bMin = Math.max(0, base.min)
  const bMax = Math.max(bMin, base.max)
  return {
    baseEtaMin: bMin,
    baseEtaMax: bMax,
    extraDaysApplied: extra,
    displayEtaMin: bMin + extra,
    displayEtaMax: bMax + extra,
    dayCountMode: policy.own.dayCountMode,
  }
}

/** Prefer extraDays; senão migra buffer/prep antigos sem doble-contagem. */
export function resolveMeExtraDays(me: ShippingEtaPolicy['me']): number {
  if (typeof me.extraDays === 'number' && !Number.isNaN(me.extraDays)) {
    return Math.max(0, me.extraDays)
  }
  const buffer = Math.max(0, me.bufferDays || 0)
  const prep = me.prepIncludedInCarrier ? 0 : Math.max(0, me.prepDays || 0)
  return buffer + prep
}

export function parseShippingEtaPolicy(raw: unknown): ShippingEtaPolicy {
  const d = DEFAULT_SHIPPING_ETA_POLICY
  if (!raw || typeof raw !== 'object') {
    return structuredClone(d)
  }
  const o = raw as Record<string, unknown>
  const me = (o.me && typeof o.me === 'object' ? o.me : {}) as Record<string, unknown>
  const own = (o.own && typeof o.own === 'object' ? o.own : {}) as Record<string, unknown>
  const mock = (o.mock && typeof o.mock === 'object' ? o.mock : {}) as Record<string, unknown>
  const pickup = (o.pickup && typeof o.pickup === 'object' ? o.pickup : {}) as Record<string, unknown>
  const mode = (v: unknown, fallback: DayCountMode): DayCountMode =>
    v === 'calendar_days' || v === 'business_days' ? v : fallback

  const bufferDays = Number(me.bufferDays ?? me.buffer_days ?? 0) || 0
  const prepDays = Number(me.prepDays ?? me.prep_days ?? 0) || 0
  const prepIncluded = Boolean(
    me.prepIncludedInCarrier ?? me.prep_included_in_carrier ?? true,
  )
  const explicitExtra = me.extraDays ?? me.extra_days
  const extraDays =
    explicitExtra != null && explicitExtra !== ''
      ? Math.max(0, Number(explicitExtra) || 0)
      : Math.max(0, bufferDays + (prepIncluded ? 0 : prepDays))

  return {
    dayCountMode: mode(o.dayCountMode ?? o.day_count_mode, d.dayCountMode),
    me: {
      extraDays,
      prepDays: 0,
      bufferDays: extraDays,
      prepIncludedInCarrier: true,
    },
    own: {
      dayCountMode: mode(own.dayCountMode ?? own.day_count_mode, d.own.dayCountMode),
      extraDays: Math.max(0, Number(own.extraDays ?? own.extra_days ?? 0) || 0),
    },
    mock: {
      economicMin: Number(mock.economicMin ?? mock.economic_min ?? d.mock.economicMin) || 0,
      economicMax: Number(mock.economicMax ?? mock.economic_max ?? d.mock.economicMax) || 0,
      expressMin: Number(mock.expressMin ?? mock.express_min ?? d.mock.expressMin) || 0,
      expressMax: Number(mock.expressMax ?? mock.express_max ?? d.mock.expressMax) || 0,
    },
    pickup: {
      availableInDaysMin: Number(
        pickup.availableInDaysMin ?? pickup.available_in_days_min ?? d.pickup.availableInDaysMin,
      ) || 0,
      availableInDaysMax: Number(
        pickup.availableInDaysMax ?? pickup.available_in_days_max ?? d.pickup.availableInDaysMax,
      ) || 0,
    },
  }
}

function structuredClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}
