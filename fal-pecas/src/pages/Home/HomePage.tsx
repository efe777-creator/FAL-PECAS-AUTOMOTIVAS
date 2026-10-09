import { Button } from '@/components/common/Button'
import { CategoryCard } from '@/components/product/CategoryCard'
import { ProductCard } from '@/components/product/ProductCard'
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
import { Link } from 'react-router-dom'

function ProductGridSection({
  title,
  subtitle,
  linkLabel,
  linkTo,
  loading,
  error,
  products,
  emptyTitle,
  emptyDescription,
}: {
  title: string
  subtitle: string
  linkLabel: string
  linkTo: string
  loading: boolean
  error: string | null
  products: ReturnType<typeof useFeaturedProducts>['data']
  emptyTitle: string
  emptyDescription: string
}) {
  return (
    <section className="bg-white py-8 sm:py-10">
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
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : null}
      </Container>
    </section>
  )
}

export function HomePage() {
  const categories = useCategories()
  const featured = useFeaturedProducts(12)
  const offers = usePromoHighlightProducts(8)
  const line = useCategoryProducts(['suspensao', 'direcao'], 8)

  return (
    <>
      <section className="bg-gradient-to-br from-fal-navy-dark to-[#4a5562] py-6 text-white sm:py-8">
        <Container>
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold tracking-[0.08em] text-fal-yellow uppercase">
              FAL Peças Automotivas
            </p>
            <h1 className="mt-2 text-[28px] font-black leading-tight sm:text-[40px]">
              Peças certas para o seu carro
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[#e3e7eb] sm:text-base">
              Busque pela peça, pelo veículo ou navegue por categoria — você escolhe o caminho.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/catalogo">
                <Button variant="primary">Buscar peça</Button>
              </Link>
              <a href="#veiculo">
                <Button variant="outline">Buscar pelo carro</Button>
              </a>
              <a href="#categorias">
                <Button variant="outline">Ver categorias</Button>
              </a>
            </div>
          </div>
        </Container>
      </section>

      <ProductGridSection
        title="Destaques"
        subtitle="Publicados no catálogo — preferência aos disponíveis na loja"
        linkLabel="Ver catálogo →"
        linkTo="/catalogo"
        loading={featured.loading}
        error={featured.error}
        products={featured.data}
        emptyTitle="Ainda não há produtos em destaque"
        emptyDescription="Explore o catálogo completo."
      />

      {!offers.loading && !offers.error && offers.data.length > 0 ? (
        <section className="border-y border-fal-line bg-[#fffdf5] py-8 sm:py-10">
          <Container>
            <div className="mb-4 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="m-0 text-[22px] font-extrabold sm:text-[26px]">Ofertas</h2>
                <p className="mt-1 text-sm text-fal-muted">
                  Preço resolvido abaixo do preço de lista
                </p>
              </div>
              <Link to="/catalogo?sort=price_asc" className="text-sm font-semibold text-fal-navy">
                Ver catálogo →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {offers.data.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </Container>
        </section>
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

      <ProductGridSection
        title="Suspensão e direção"
        subtitle="Linha prioritária FAL — categorias raiz e subgrupos"
        linkLabel="Ver suspensão →"
        linkTo="/catalogo?cat=suspensao"
        loading={line.loading}
        error={line.error}
        products={line.data}
        emptyTitle="Em preparação"
        emptyDescription="Em breve produtos desta linha em destaque."
      />

      <section id="veiculo" className="scroll-mt-20 border-t border-fal-line bg-fal-bg py-6 sm:py-8">
        <Container>
          <div className="mb-3">
            <h2 className="m-0 text-lg font-extrabold sm:text-xl">Buscar pelo carro</h2>
            <p className="mt-1 text-sm text-fal-muted">
              Informe só o que souber — montadora, modelo, ano ou motor.
            </p>
          </div>
          <div className="max-w-3xl rounded-[12px] border border-fal-line bg-white p-3 shadow-sm sm:p-4">
            <VehicleSelector />
          </div>
        </Container>
      </section>
    </>
  )
}
