import { Button } from '@/components/common/Button'
import { Link, useNavigate } from 'react-router-dom'

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

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Seções da Home da loja">
      <Button
        type="button"
        role="tab"
        aria-selected={active === 'banners'}
        variant={active === 'banners' ? 'primary' : 'outline'}
        onClick={() => goHomeTab('banners')}
      >
        Campanhas{bannersCount != null ? ` (${bannersCount})` : ''}
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={active === 'featured'}
        variant={active === 'featured' ? 'primary' : 'outline'}
        onClick={() => goHomeTab('featured')}
      >
        Destaques
        {featuredCount != null && featuredMax != null
          ? ` (${featuredCount}/${featuredMax})`
          : ''}
      </Button>
      <Link
        to="/admin/home/promocoes"
        role="tab"
        aria-selected={active === 'promotions'}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-[10px] border px-[19px] py-[13px] text-sm font-extrabold no-underline transition',
          active === 'promotions'
            ? 'border-transparent bg-fal-yellow text-fal-navy-dark'
            : 'border-fal-navy/30 bg-white text-fal-navy hover:bg-fal-bg',
        ].join(' ')}
      >
        Promoções
      </Link>
      <Button
        type="button"
        role="tab"
        aria-selected={active === 'payment'}
        variant={active === 'payment' ? 'primary' : 'outline'}
        onClick={() => goHomeTab('payment')}
      >
        Pagamento
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={active === 'config'}
        variant={active === 'config' ? 'primary' : 'outline'}
        onClick={() => goHomeTab('config')}
      >
        Config
      </Button>
    </div>
  )
}
