import { Button } from '@/components/common/Button'
import { COMPRAR_AGORA_LABEL } from '@/lib/productLabels'
import { formatMoney } from '@/lib/money'

type Props = {
  priceLabel: string
  available: boolean
  onBuyNow: () => void
}

/**
 * Barra inferior mobile — preço curto + espelha `onBuyNow` (plano referência M7).
 */
export function PdpPurchaseBar({ priceLabel, available, onBuyNow }: Props) {
  if (!available) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[120] border-t border-fal-line bg-fal-surface/95 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-fal backdrop-blur-sm lg:hidden"
      role="region"
      aria-label="Compra rápida"
    >
      <div className="mx-auto flex max-w-[1440px] items-center gap-3">
        <p className="m-0 min-w-0 flex-1 truncate text-base font-black text-fal-navy dark:text-fal-fg">
          {priceLabel}
        </p>
        <Button variant="dark" className="shrink-0" onClick={onBuyNow}>
          {COMPRAR_AGORA_LABEL}
        </Button>
      </div>
    </div>
  )
}

/** Helper tipado para testes / callers que montam o rótulo. */
export function pdpBarPriceLabel(amount: number): string {
  return formatMoney(amount)
}
