import {
  formatStoreOriginAddress,
  STORE_PICKUP_READY_NOTICE,
} from '@/services/shipping/storePickupOption'
import type { StoreShippingOrigin } from '@/types'

type Props = {
  origin: StoreShippingOrigin | null | undefined
  compact?: boolean
}

export function StorePickupNotice({ origin, compact }: Props) {
  return (
    <div
      className={
        compact
          ? 'mt-2 rounded-[8px] border border-fal-line bg-white px-2.5 py-2 text-xs text-fal-ink'
          : 'mt-3 rounded-fal border border-fal-line bg-fal-bg px-3 py-3 text-sm text-fal-ink'
      }
      role="status"
    >
      <p className="m-0 font-bold text-fal-navy">Retirada na loja — R$ 0,00</p>
      {origin ? (
        <p className="mb-0 mt-1 text-fal-ink">{formatStoreOriginAddress(origin)}</p>
      ) : (
        <p className="mb-0 mt-1 text-fal-muted">
          Endereço da loja será confirmado no checkout.
        </p>
      )}
      <p className={`mb-0 mt-1 text-fal-muted ${compact ? 'text-[11px]' : 'text-xs'}`}>
        {STORE_PICKUP_READY_NOTICE}
      </p>
    </div>
  )
}
