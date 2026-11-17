import { AdminTabs } from '@/components/admin/AdminTabs'
import { useNavigate } from 'react-router-dom'

export type HomeSectionTab = 'banners' | 'featured' | 'promotions' | 'payment' | 'config'

type Props = {
  active: HomeSectionTab
  /** Contagens opcionais nas abas da Home. */
  bannersCount?: number
  featuredCount?: number
  featuredMax?: number
  onSelectLocal?: (tab: Exclude<HomeSectionTab, 'promotions'>) => void
}

/**
 * Faixa única de seções da Home da loja.
 * Promoções vive em rota própria; as demais permanecem em /admin/home.
 */
export function AdminHomeSectionTabs({
  active,
  bannersCount,
  featuredCount,
  featuredMax,
  onSelectLocal,
}: Props) {
  const navigate = useNavigate()

  function goHomeTab(tab: Exclude<HomeSectionTab, 'promotions'>) {
    if (onSelectLocal) {
      onSelectLocal(tab)
      return
    }
    navigate(`/admin/home?tab=${tab}`, { state: { homeTab: tab } })
  }

  const featuredLabelCount =
    featuredCount != null && featuredMax != null
      ? `${featuredCount}/${featuredMax}`
      : featuredCount

  return (
    <AdminTabs
      aria-label="Seções da Home da loja"
      activeId={active}
      items={[
        {
          id: 'banners',
          label: 'Campanhas',
          count: bannersCount,
          onSelect: () => goHomeTab('banners'),
        },
        {
          id: 'featured',
          label: 'Destaques',
          count: featuredLabelCount,
          onSelect: () => goHomeTab('featured'),
        },
        {
          id: 'promotions',
          label: 'Promoções',
          to: '/admin/home/promocoes',
        },
        {
          id: 'payment',
          label: 'Pagamentos',
          onSelect: () => goHomeTab('payment'),
        },
        {
          id: 'config',
          label: 'Config',
          onSelect: () => goHomeTab('config'),
        },
      ]}
    />
  )
}
