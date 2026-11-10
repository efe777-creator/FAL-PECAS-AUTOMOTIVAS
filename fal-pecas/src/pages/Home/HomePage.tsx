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
import { excludeProductsById, HOME_FEATURED_LIMIT_DEFAULT } from '@/lib/homeSections'
import { getStoreIdentity } from '@/lib/storeIdentity'
import { getFeaturedDisplayLimit } from '@/services/home/homeContentService'
import { useEffect, useMemo, useState } from 'react'
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
          ? 'border-y border-fal-line bg-[#fffdf5] py-8 sm:py-10'
          : 'bg-white py-8 sm:py-10'
      }
    >
      <Container>
        <div className="mb-4 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="m-0 text-[22px] font-extrabold sm:text-[26px]">{title}</h2>
            <p className="mt-1 text-sm text-fal-muted">{subtitle}</p>
          </div>
          <Link to={linkTo} className="text-sm font-semibold text-fal-navy">
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

export function HomePage() {
  const categories = useCategories()
  const [featuredLimit, setFeaturedLimit] = useState(HOME_FEATURED_LIMIT_DEFAULT)
  const [shelfPanel, setShelfPanel] = useState<HomeShelfPanel>('featured')
  const featured = useFeaturedProducts(featuredLimit)
  const offers = usePromoHighlightProducts(8)
  useDocumentTitle('FAL Peças Automotivas')

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

  function toggleShelf(panel: Exclude<HomeShelfPanel, 'featured'>) {
    setShelfPanel((prev) => (prev === panel ? 'featured' : panel))
  }

  /**
   * Ordem: Campanhas → Entrada (3 botões) → Vitrine → Ofertas → Confiança.
   * Categorias e Meus veículos trocam o painel abaixo (menu), sem sair da Home.
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
        className="border-b border-fal-line bg-white py-6 sm:py-8"
        aria-live="polite"
      >
        <Container>
          {shelfPanel === 'featured' ? (
            <div>
              <div className="mb-4 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="m-0 text-[22px] font-extrabold sm:text-[26px]">Destaques</h2>
                  <p className="mt-1 text-sm text-fal-muted">Seleção da loja — deslize para ver mais</p>
                </div>
                <Link to="/catalogo" className="text-sm font-semibold text-fal-navy">
                  Ver catálogo →
                </Link>
              </div>
              {featured.loading || offers.loading ? <Loading /> : null}
              {featured.error ? <ErrorState message={featured.error} /> : null}
              {!featured.loading &&
              !offers.loading &&
              !featured.error &&
              featuredWithoutOffers.length === 0 ? (
                <EmptyState
                  title="Ainda não há produtos em destaque"
                  description="Explore o catálogo completo."
                  actionLabel="Ver catálogo"
                  actionTo="/catalogo"
                />
              ) : null}
              {!featured.loading &&
              !offers.loading &&
              !featured.error &&
              featuredWithoutOffers.length > 0 ? (
                <ProductCarousel products={featuredWithoutOffers} label="Destaques" />
              ) : null}
            </div>
          ) : null}

          {shelfPanel === 'categories' ? (
            <div id="categorias">
              <div className="mb-4 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="m-0 text-[22px] font-extrabold sm:text-[26px]">Categorias</h2>
                  <p className="mt-1 text-sm text-fal-muted">Navegue por sistema automotivo</p>
                </div>
                <Link to="/catalogo" className="text-sm font-semibold text-fal-navy">
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
          ) : null}

          {shelfPanel === 'vehicles' ? <HomeVehiclesPanel /> : null}
        </Container>
      </section>

      {!offers.loading && !offers.error && offers.data.length > 0 ? (
        <ProductRailSection
          title="Ofertas"
          subtitle="Peças com preço promocional (automático)"
          linkLabel="Ver catálogo →"
          linkTo="/catalogo?sort=price_asc"
          loading={false}
          error={null}
          products={offers.data}
          emptyTitle="Sem ofertas no momento"
          emptyDescription="Volte em breve."
          tone="sand"
        />
      ) : null}

      <HomeTrustSection />
    </>
  )
}
