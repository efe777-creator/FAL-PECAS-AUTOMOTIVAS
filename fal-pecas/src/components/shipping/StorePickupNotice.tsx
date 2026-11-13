import {
  formatStoreOriginAddress,
  STORE_PICKUP_HOURS_LABEL,
  STORE_PICKUP_NOTIFY_NOTICE,
  STORE_PICKUP_READY_NOTICE,
  STORE_PICKUP_SWITCH_NOTICE,
} from '@/services/shipping/storePickupOption'
import type { StoreShippingOrigin } from '@/types'

type Props = {
  origin: StoreShippingOrigin | null | undefined
  compact?: boolean
  /** Checkout: reforça troca de modalidade. */
  showSwitchHint?: boolean
}

export function StorePickupNotice({ origin, compact, showSwitchHint }: Props) {
  return (
    <div
      className={
        compact
          ? 'mt-2 rounded-[8px] border border-fal-line bg-white px-2.5 py-2 text-xs text-fal-ink'
          : 'mt-3 rounded-fal border border-fal-line bg-fal-bg px-3 py-3 text-sm text-fal-ink'
      }
      role="status"
    >
      <p className="m-0 font-bold text-fal-navy">
        {compact ? 'Retirada na loja' : 'Onde retirar'}
      </p>
      {origin ? (
        <p className="mb-0 mt-1 text-fal-ink">{formatStoreOriginAddress(origin)}</p>
      ) : (
        <p className="mb-0 mt-1 text-fal-muted">
          Endereço da loja será confirmado no checkout.
        </p>
      )}
      {!compact ? (
        <p className="mb-0 mt-1 text-fal-ink">
          <span className="font-semibold text-fal-navy">Horário:</span> {STORE_PICKUP_HOURS_LABEL}
        </p>
      ) : null}
      <p className={`mb-0 mt-1 text-fal-muted ${compact ? 'text-[11px]' : 'text-xs'}`}>
        {compact ? STORE_PICKUP_READY_NOTICE : STORE_PICKUP_NOTIFY_NOTICE}
      </p>
      {!compact && showSwitchHint !== false ? (
        <p className="mb-0 mt-2 text-xs font-semibold text-fal-navy">{STORE_PICKUP_SWITCH_NOTICE}</p>
      ) : null}
    </div>
  )
}
