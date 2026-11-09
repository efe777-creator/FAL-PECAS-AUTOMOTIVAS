import { CategoryCard } from '@/components/product/CategoryCard'
import { HomeBannerCarousel } from '@/components/home/HomeBannerCarousel'
import { HomeQuickEntry } from '@/components/home/HomeQuickEntry'
import { ProductCarousel } from '@/components/home/ProductCarousel'
import { VehicleSelector } from '@/components/vehicle/VehicleSelector'
import { Container } from '@/components/layout/Container'
import { Loading } from '@/components/common/Loading'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import {
  useCategories,
  useCategoryProducts,
  useFeaturedProducts,
  usePromoHighlightProducts,
} from '@/hooks/useCatalog'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { excludeProductsById, HOME_FEATURED_LIMIT } from '@/lib/homeSections'
import { getStoreIdentity } from '@/lib/storeIdentity'
import { useEffect, useMemo } from 'react'
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
  const featured = useFeaturedProducts(HOME_FEATURED_LIMIT)
  const offers = usePromoHighlightProducts(8)
  const line = useCategoryProducts(['suspensao', 'direcao'], 8)
  useDocumentTitle('FAL Peças Automotivas')

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

  /** Ordem MVP: Campanhas → veículo (slot placa) → Destaques → ofertas → categorias. */
  return (
    <>
      <HomeBannerCarousel />
      <HomeQuickEntry />

      <section
        id="veiculo"
        className="scroll-mt-20 border-b border-fal-line bg-fal-bg py-6 sm:py-8"
      >
        <Container>
          <div className="mb-3 max-w-3xl">
            <h2 className="m-0 text-lg font-extrabold sm:text-xl">Buscar pelo carro</h2>
            <p className="mt-1 text-sm text-fal-muted">
              Informe montadora, modelo, ano ou motor. A busca por placa entra neste mesmo
              espaço quando estiver disponível.
            </p>
          </div>
          <div className="max-w-3xl rounded-[12px] border border-fal-line bg-white p-3 shadow-sm sm:p-4">
            <VehicleSelector />
          </div>
        </Container>
      </section>

      <ProductRailSection
        title="Destaques"
        subtitle="Seleção da loja — deslize para ver mais"
        linkLabel="Ver catálogo →"
        linkTo="/catalogo"
        loading={featured.loading || offers.loading}
        error={featured.error}
        products={featuredWithoutOffers}
        emptyTitle="Ainda não há produtos em destaque"
        emptyDescription="Explore o catálogo completo."
      />

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

      <section id="categorias" className="scroll-mt-20 py-8 sm:py-10">
        <Container>
          <div className="mb-4 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="m-0 text-[22px] font-extrabold sm:text-[26px]">Categorias</h2>
              <p className="mt-1 text-sm text-fal-muted">Navegue por departamento</p>
            </div>
            <Link to="/catalogo" className="text-sm font-semibold text-fal-navy">
              Ver todas →
            </Link>
          </div>
          {categories.loading ? <Loading /> : null}
          {categories.error ? <ErrorState message={categories.error} /> : null}
          {!categories.loading && !categories.error && categories.data.length === 0 ? (
            <EmptyState title="Nenhuma categoria publicada" description="Em breve novas categorias." />
          ) : null}
          {!categories.loading && categories.data.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
              {categories.data.map((c) => (
                <CategoryCard key={c.id} category={c} />
              ))}
            </div>
          ) : null}
        </Container>
      </section>

      <ProductRailSection
        title="Suspensão e direção"
        subtitle="Amortecedores, terminais, buchas e peças de direção"
        linkLabel="Ver suspensão →"
        linkTo="/catalogo?cat=suspensao"
        loading={line.loading}
        error={line.error}
        products={line.data}
        emptyTitle="Em preparação"
        emptyDescription="Em breve produtos desta linha em destaque."
      />
    </>
  )
}
