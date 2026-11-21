import { CategoryCard } from '@/components/product/CategoryCard'
import { HomeBannerCarousel } from '@/components/home/HomeBannerCarousel'
import {
  HomeQuickEntry,
  type HomeShelfPanel,
} from '@/components/home/HomeQuickEntry'
import { HomeTrustSection } from '@/components/home/HomeTrustSection'
import { HomeVehiclesPanel } from '@/components/home/HomeVehiclesPanel'
import { ProductCarousel } from '@/components/home/ProductCarousel'
import { Container } from '@/components/layout/Container'
import { Loading } from '@/components/common/Loading'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import {
  useCategories,
  useFeaturedProducts,
  usePromoHighlightProducts,
} from '@/hooks/useCatalog'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useOpenGraph } from '@/hooks/useOpenGraph'
import { excludeProductsById, HOME_FEATURED_LIMIT_DEFAULT } from '@/lib/homeSections'
import { getProductWidgetDef } from '@/lib/productWidgets'
import { getStoreIdentity } from '@/lib/storeIdentity'
import { getFeaturedDisplayLimit } from '@/services/home/homeContentService'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '@/types'

function ProductRailSection({
  title,
  subtitle,
  linkLabel,
  linkTo,
  loading,
  error,
  products,
  emptyTitle,
  emptyDescription,
  tone = 'white',
}: {
  title: string
  subtitle: string
  linkLabel: string
  linkTo: string
  loading: boolean
  error: string | null
  products: Product[]
  emptyTitle: string
  emptyDescription: string
  tone?: 'white' | 'sand'
}) {
  return (
    <section
      className={
        tone === 'sand'
          ? 'border-y border-fal-yellow/25 bg-fal-yellow/10 py-8 sm:py-10'
          : 'bg-fal-surface py-8 sm:py-10'
      }
    >
      <Container>
        <div className="mb-4 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-fal-yellow-dark dark:text-fal-yellow">
              FAL
            </p>
            <h2 className="m-0 mt-1 text-[22px] font-black tracking-tight text-fal-navy dark:text-fal-fg sm:text-[26px]">
              {title}
            </h2>
            <p className="mt-1 text-sm text-fal-muted">{subtitle}</p>
          </div>
          <Link
            to={linkTo}
            className="text-sm font-semibold text-fal-accent underline-offset-2 hover:underline"
          >
            {linkLabel}
          </Link>
        </div>
        {loading ? <Loading /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!loading && !error && products.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            actionLabel="Ver catálogo"
            actionTo="/catalogo"
          />
        ) : null}
        {!loading && !error && products.length > 0 ? (
          <ProductCarousel products={products} label={title} />
        ) : null}
      </Container>
    </section>
  )
}

/** Troca painel sem pular o scroll da página. */
function useStableShelfToggle(setShelfPanel: Dispatch<SetStateAction<HomeShelfPanel>>) {
  return useCallback(
    (panel: Exclude<HomeShelfPanel, 'featured'>) => {
      const y = typeof window !== 'undefined' ? window.scrollY : 0
      setShelfPanel((prev) => (prev === panel ? 'featured' : panel))
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (typeof window === 'undefined') return
          if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y)
        })
      })
    },
    [setShelfPanel],
  )
}

export function HomePage() {
  const categories = useCategories()
  const [featuredLimit, setFeaturedLimit] = useState(HOME_FEATURED_LIMIT_DEFAULT)
  const [shelfPanel, setShelfPanel] = useState<HomeShelfPanel>('featured')
  const featured = useFeaturedProducts(featuredLimit)
  const offers = usePromoHighlightProducts(8)
  const toggleShelf = useStableShelfToggle(setShelfPanel)
  useDocumentTitle('FAL Peças Automotivas')
  useOpenGraph({
    title: 'FAL Peças Automotivas',
    description: 'Encontre a peça certa para o seu veículo.',
    type: 'website',
  })

  useEffect(() => {
    let active = true
    void getFeaturedDisplayLimit().then((n) => {
      if (active) setFeaturedLimit(n)
    })
    return () => {
      active = false
    }
  }, [])

  /** JSON-LD Organization + WebSite (Onda 2 SEO). */
  useEffect(() => {
    const store = getStoreIdentity()
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const org: Record<string, unknown> = {
      '@type': 'Organization',
      name: store.legalName,
      url: origin || undefined,
    }
    if (store.cnpjFormatted) org.taxID = store.cnpjFormatted
    if (store.phone) org.telephone = store.phoneDisplay ?? store.phone
    if (store.email) org.email = store.email
    if (store.cityState) {
      org.address = {
        '@type': 'PostalAddress',
        addressLocality: store.cityState,
        addressCountry: 'BR',
      }
    }
    const payload = {
      '@context': 'https://schema.org',
      '@graph': [
        org,
        {
          '@type': 'WebSite',
          name: store.legalName,
          url: origin || undefined,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${origin}/catalogo?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
      ],
    }
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'fal-home-jsonld'
    el.text = JSON.stringify(payload)
    document.getElementById('fal-home-jsonld')?.remove()
    document.head.appendChild(el)
    return () => {
      el.remove()
    }
  }, [])

  const featuredWithoutOffers = useMemo(
    () => excludeProductsById(featured.data, offers.data),
    [featured.data, offers.data],
  )
  const featuredWidget = getProductWidgetDef('featured')
  const offersWidget = getProductWidgetDef('offers')

  /**
   * Ordem: Campanhas → Entrada → Vitrine (painéis montados, só um visível) → Ofertas → Confiança.
   * Painéis ficam montados para não “recarregar” nem colapsar altura a cada clique.
   */
  return (
    <>
      <HomeBannerCarousel />
      <HomeQuickEntry
        activePanel={shelfPanel}
        onOpenCategories={() => toggleShelf('categories')}
        onOpenVehicles={() => toggleShelf('vehicles')}
      />

      <section
        id="home-vitrine"
        className="border-b border-fal-line bg-fal-surface py-6 sm:py-8"
      >
        <Container>
          <div
            className={shelfPanel === 'featured' ? undefined : 'hidden'}
            aria-hidden={shelfPanel !== 'featured'}
          >
            <div className="mb-4 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-fal-yellow-dark dark:text-fal-yellow">
                  Vitrine
                </p>
                <h2 className="m-0 mt-1 text-[22px] font-black tracking-tight text-fal-navy dark:text-fal-fg sm:text-[26px]">
                  {featuredWidget?.title ?? 'Destaques'}
                </h2>
                <p className="mt-1 text-sm text-fal-muted">
                  {featuredWidget?.subtitle ?? 'Seleção da loja — deslize para ver mais'}
                </p>
              </div>
              <Link
                to={featuredWidget?.catalogHref ?? '/catalogo'}
                className="text-sm font-semibold text-fal-accent underline-offset-2 hover:underline"
              >
                {featuredWidget?.linkLabel ?? 'Ver catálogo →'}
              </Link>
            </div>
            {featured.loading && featuredWithoutOffers.length === 0 ? <Loading /> : null}
            {featured.error ? <ErrorState message={featured.error} /> : null}
            {!featured.loading &&
            !featured.error &&
            featuredWithoutOffers.length === 0 ? (
              <EmptyState
                title="Ainda não há produtos em destaque"
                description="Explore o catálogo completo."
                actionLabel="Ver catálogo"
                actionTo="/catalogo"
              />
            ) : null}
            {featuredWithoutOffers.length > 0 ? (
              <ProductCarousel
                products={featuredWithoutOffers}
                label={featuredWidget?.title ?? 'Destaques'}
              />
            ) : null}
          </div>

          <div
            id="categorias"
            className={shelfPanel === 'categories' ? undefined : 'hidden'}
            aria-hidden={shelfPanel !== 'categories'}
          >
            <div className="mb-4 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-fal-yellow-dark dark:text-fal-yellow">
                  Catálogo
                </p>
                <h2 className="m-0 mt-1 text-[22px] font-black tracking-tight text-fal-navy dark:text-fal-fg sm:text-[26px]">
                  Categorias
                </h2>
                <p className="mt-1 text-sm text-fal-muted">Navegue por sistema automotivo</p>
              </div>
              <Link
                to="/catalogo"
                className="text-sm font-semibold text-fal-accent underline-offset-2 hover:underline"
              >
                Ver todas →
              </Link>
            </div>
            {categories.loading ? <Loading /> : null}
            {categories.error ? <ErrorState message={categories.error} /> : null}
            {!categories.loading && !categories.error && categories.data.length === 0 ? (
              <EmptyState
                title="Nenhuma categoria publicada"
                description="Em breve novas categorias."
              />
            ) : null}
            {!categories.loading && categories.data.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
                {categories.data.map((c) => (
                  <CategoryCard key={c.id} category={c} />
                ))}
              </div>
            ) : null}
          </div>

          <div
            className={shelfPanel === 'vehicles' ? undefined : 'hidden'}
            aria-hidden={shelfPanel !== 'vehicles'}
          >
            <HomeVehiclesPanel />
          </div>
        </Container>
      </section>

      {!offers.loading && !offers.error && offers.data.length > 0 ? (
        <ProductRailSection
          title={offersWidget?.title ?? 'Ofertas'}
          subtitle={offersWidget?.subtitle ?? 'Peças com preço promocional (automático)'}
          linkLabel={offersWidget?.linkLabel ?? 'Ver catálogo →'}
          linkTo={offersWidget?.catalogHref ?? '/catalogo?sort=price_asc'}
          loading={false}
          error={null}
          products={offers.data}
          emptyTitle="Sem ofertas no momento"
          emptyDescription="Volte em breve."
          tone={offersWidget?.tone ?? 'sand'}
        />
      ) : null}

      <HomeTrustSection />
    </>
  )
}
