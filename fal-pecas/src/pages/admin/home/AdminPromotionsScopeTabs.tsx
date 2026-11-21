import { AdminTabs } from '@/components/admin/AdminTabs'

export type PromotionsScope = 'items' | 'kits'

type Props = {
  active: PromotionsScope
  itemsCount?: number
  kitsCount?: number
}

/**
 * Submenu Promoções: itens vs kits (mesmo gate product_promotions).
 */
export function AdminPromotionsScopeTabs({ active, itemsCount, kitsCount }: Props) {
  return (
    <AdminTabs
      aria-label="Escopo das promoções"
      activeId={active}
      items={[
        {
          id: 'items',
          label: 'Itens',
          count: itemsCount,
          to: '/admin/home/promocoes',
        },
        {
          id: 'kits',
          label: 'Kits',
          count: kitsCount,
          to: '/admin/home/promocoes/kits',
        },
      ]}
    />
  )
}
