import { Button, buttonClassName } from '@/components/common/Button'
import { PRICE_LIST_KITS_MANUAL_ID } from '@/services/admin/adminKitPricingService'
import {
  PRICE_LIST_BASE_ID,
  PRICE_LIST_PROMO_ID,
  priceListStatusLabel,
  type PriceListOverviewRow,
} from '@/services/admin/adminPriceListService'
import { PriceListQuickAdjustPanel } from '@/pages/admin/prices/PriceListQuickAdjustPanel'
import { Link } from 'react-router-dom'

export function isKitsManualPriceList(list: Pick<PriceListOverviewRow, 'id' | 'slug'>): boolean {
  return list.id === PRICE_LIST_KITS_MANUAL_ID || list.slug === 'preco-kits-manual'
}

/** Listas elegíveis na guia de consulta/ajuste (exclui kits-manual). */
export function priceListsForWorkspaceGuide(lists: PriceListOverviewRow[]): PriceListOverviewRow[] {
  return lists.filter((l) => !isKitsManualPriceList(l))
}

type Props = {
  lists: PriceListOverviewRow[]
  listId: string
  allowed: boolean
  changedBy?: string | null
  forceWithoutPrice?: boolean
  onItemsChanged?: () => void
  onListIdChange?: (listId: string) => void
  onRequestImport?: () => void
  onClose: () => void
}

export function PriceListWorkSurface({
  lists,
  listId,
  allowed,
  changedBy,
  forceWithoutPrice,
  onItemsChanged,
  onListIdChange,
  onRequestImport,
  onClose,
}: Props) {
  const focused = lists.find((l) => l.id === listId) ?? null
  const isSystem =
    focused?.id === PRICE_LIST_BASE_ID ||
    focused?.id === PRICE_LIST_PROMO_ID ||
    /^(base|promo)$/i.test(focused?.slug ?? '')

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-1" data-price-ops-density="compact">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fal-line pb-2">
        <div className="min-w-0">
          <p className="m-0 text-xs font-semibold text-fal-muted">Aberto na guia · consulta e ajuste</p>
          {focused ? (
            <p className="mb-0 mt-1 truncate text-sm font-extrabold text-fal-fg">
              {focused.name}
              <span className="ml-2 text-xs font-semibold text-fal-muted">
                {priceListStatusLabel(focused.status)}
              </span>
              {isSystem ? (
                <span className="ml-2 rounded-full bg-fal-yellow/35 px-2 py-0.5 text-xs font-bold text-fal-navy-dark">
                  Sistema
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="shrink-0 text-xs font-semibold text-fal-muted underline"
          onClick={onClose}
        >
          Fechar guia
        </button>
      </div>

      {focused ? (
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/admin/precos/${focused.id}?tab=produtos`}
            className={buttonClassName({ variant: 'primary' })}
          >
            Abrir lista completa
          </Link>
          {onRequestImport ? (
            <Button type="button" variant="light" onClick={onRequestImport}>
              Importar planilha
            </Button>
          ) : null}
          <Link
            to={`/admin/precos/${focused.id}?tab=formacao`}
            className={buttonClassName({ variant: 'light' })}
          >
            Formação
          </Link>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <PriceListQuickAdjustPanel
          lists={lists}
          allowed={allowed}
          changedBy={changedBy}
          onItemsChanged={onItemsChanged}
          onListIdChange={onListIdChange}
          forceWithoutPrice={forceWithoutPrice}
          onRequestImport={onRequestImport}
          forcedListId={listId || undefined}
          embedded
        />
      </div>
    </div>
  )
}