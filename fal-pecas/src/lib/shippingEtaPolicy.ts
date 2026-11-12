/**
 * Modelo de prazo V2.2 Marcha 1b — política FAL sobre prazos dos meios.
 * Fonte de configuração: tela Logística (não Pedidos).
 */

export type DayCountMode = 'business_days' | 'calendar_days'

export type ShippingEtaPolicy = {
  /** Own / ME / mock compartilham modo padrão; meios podem sobrescrever. */
  dayCountMode: DayCountMode
  me: {
    /** Dias de preparação FAL antes do carrier (0 se já incluso no prazo ME). */
    prepDays: number
    /** Buffer operacional adicional. */
    bufferDays: number
    /**
     * Se true, NÃO soma prepDays ao carrier (prep já contemplada no prazo do provedor).
     * Buffer ainda pode ser somado se bufferDays > 0.
     */
    prepIncludedInCarrier: boolean
  }
  own: {
    dayCountMode: DayCountMode
  }
  mock: {
    economicMin: number
    economicMax: number
    expressMin: number
    expressMax: number
  }
  pickup: {
    /** Dias até disponível para retirada (0 = mesmo dia). */
    availableInDaysMin: number
    availableInDaysMax: number
  }
}

export const DEFAULT_SHIPPING_ETA_POLICY: ShippingEtaPolicy = {
  dayCountMode: 'business_days',
  me: {
    prepDays: 1,
    bufferDays: 0,
    prepIncludedInCarrier: false,
  },
  own: {
    dayCountMode: 'business_days',
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

export type CarrierEtaRange = { min: number; max: number }

export type DisplayEtaResult = {
  carrierEtaMin: number
  carrierEtaMax: number
  prepDaysApplied: number
  bufferDaysApplied: number
  displayEtaMin: number
  displayEtaMax: number
  dayCountMode: DayCountMode
}

/**
 * Prazo exibido ME = carrier + prep (se não inclusa) + buffer.
 * Nunca soma prep duas vezes quando prepIncludedInCarrier=true.
 */
export function computeMeDisplayEta(
  carrier: CarrierEtaRange,
  policy: Pick<ShippingEtaPolicy, 'dayCountMode' | 'me'>,
): DisplayEtaResult {
  const prep = policy.me.prepIncludedInCarrier ? 0 : Math.max(0, policy.me.prepDays)
  const buffer = Math.max(0, policy.me.bufferDays)
  const cMin = Math.max(0, carrier.min)
  const cMax = Math.max(cMin, carrier.max)
  return {
    carrierEtaMin: cMin,
    carrierEtaMax: cMax,
    prepDaysApplied: prep,
    bufferDaysApplied: buffer,
    displayEtaMin: cMin + prep + buffer,
    displayEtaMax: cMax + prep + buffer,
    dayCountMode: policy.dayCountMode,
  }
}

export function parseShippingEtaPolicy(raw: unknown): ShippingEtaPolicy {
  const d = DEFAULT_SHIPPING_ETA_POLICY
  if (!raw || typeof raw !== 'object') return { ...d, me: { ...d.me }, own: { ...d.own }, mock: { ...d.mock }, pickup: { ...d.pickup } }
  const o = raw as Record<string, unknown>
  const me = (o.me && typeof o.me === 'object' ? o.me : {}) as Record<string, unknown>
  const own = (o.own && typeof o.own === 'object' ? o.own : {}) as Record<string, unknown>
  const mock = (o.mock && typeof o.mock === 'object' ? o.mock : {}) as Record<string, unknown>
  const pickup = (o.pickup && typeof o.pickup === 'object' ? o.pickup : {}) as Record<string, unknown>
  const mode = (v: unknown, fallback: DayCountMode): DayCountMode =>
    v === 'calendar_days' || v === 'business_days' ? v : fallback
  return {
    dayCountMode: mode(o.dayCountMode ?? o.day_count_mode, d.dayCountMode),
    me: {
      prepDays: Number(me.prepDays ?? me.prep_days ?? d.me.prepDays) || 0,
      bufferDays: Number(me.bufferDays ?? me.buffer_days ?? d.me.bufferDays) || 0,
      prepIncludedInCarrier: Boolean(
        me.prepIncludedInCarrier ?? me.prep_included_in_carrier ?? d.me.prepIncludedInCarrier,
      ),
    },
    own: {
      dayCountMode: mode(own.dayCountMode ?? own.day_count_mode, d.own.dayCountMode),
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
