import { Button } from '@/components/common/Button'
import { CategoryCard } from '@/components/product/CategoryCard'
import { ProductCard } from '@/components/product/ProductCard'
import { VehicleSelector } from '@/components/vehicle/VehicleSelector'
import { Container } from '@/components/layout/Container'
import { Loading } from '@/components/common/Loading'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { useCategories, useFeaturedProducts } from '@/hooks/useCatalog'
import { Link } from 'react-router-dom'

export function HomePage() {
  const categories = useCategories()
  const featured = useFeaturedProducts(8)

  return (
    <>
      <section className="overflow-hidden bg-gradient-to-br from-fal-navy-dark to-[#4a5562] py-8 text-white sm:py-[42px] lg:py-[58px]">
        <Container className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-[45px]">
          <div>
            <div className="text-xs font-extrabold tracking-[0.08em] text-fal-yellow uppercase">
              FAL Peças Automotivas
            </div>
            <h1 className="my-3 text-[34px] leading-[1.02] font-black sm:text-[38px] lg:text-[clamp(34px,5vw,62px)]">
              Encontre a peça certa para o seu carro.
            </h1>
            <p className="max-w-[600px] text-[15px] text-[#e3e7eb] sm:text-lg">
              Pesquise diretamente pelo que precisa ou selecione seu veículo para encontrar
              produtos compatíveis. Você escolhe o caminho mais rápido.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#veiculo">
                <Button variant="primary">🚗 Selecionar veículo</Button>
              </a>
              <Link to="/catalogo">
                <Button variant="outline">Explorar catálogo</Button>
              </Link>
            </div>
          </div>
          <VehicleSelector />
        </Container>
      </section>

      <section className="py-9 sm:py-12">
        <Container>
          <div className="mb-5 flex flex-col items-start justify-between gap-2 sm:mb-6 sm:flex-row sm:items-end">
            <div>
              <h2 className="m-0 text-[23px] font-extrabold sm:text-[28px]">Navegue pelo catálogo</h2>
              <p className="mt-1 text-fal-muted">
                Outra forma de encontrar a peça é começar por uma categoria.
              </p>
            </div>
            <Link to="/catalogo" className="font-semibold text-fal-navy">
              Ver todas →
            </Link>
          </div>
          {categories.loading ? <Loading /> : null}
          {categories.error ? <ErrorState message={categories.error} /> : null}
          {!categories.loading && !categories.error && categories.data.length === 0 ? (
            <EmptyState title="Nenhuma categoria" description="Categorias serão carregadas em breve." />
          ) : null}
          {!categories.loading && categories.data.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-[18px] lg:grid-cols-4">
              {categories.data.map((c) => (
                <CategoryCard key={c.id} category={c} />
              ))}
            </div>
          ) : null}
        </Container>
      </section>

      <section className="bg-white py-9 sm:py-12">
        <Container>
          <div className="mb-5 flex flex-col items-start justify-between gap-2 sm:mb-6 sm:flex-row sm:items-end">
            <div>
              <h2 className="m-0 text-[23px] font-extrabold sm:text-[28px]">Produtos em destaque</h2>
              <p className="mt-1 text-fal-muted">
                Dados via Supabase (seed estrutural da Fase 2 — catálogo comercial entra na Fase 3).
              </p>
            </div>
            <Link to="/catalogo" className="font-semibold text-fal-navy">
              Ver catálogo →
            </Link>
          </div>
          {featured.loading ? <Loading /> : null}
          {featured.error ? <ErrorState message={featured.error} /> : null}
          {!featured.loading && !featured.error && featured.data.length === 0 ? (
            <EmptyState title="Sem destaques" actionLabel="Ver catálogo" actionTo="/catalogo" />
          ) : null}
          {!featured.loading && featured.data.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-[18px] lg:grid-cols-4">
              {featured.data.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : null}
        </Container>
      </section>

      <section className="py-9 sm:py-12">
        <Container>
          <div className="rounded-[10px] border border-[#f0d979] bg-[#fff8db] p-3.5 text-sm sm:text-base">
            <b>🧠 Conceito central da FAL:</b> o cliente pode pesquisar por texto, navegar por
            categoria ou selecionar o veículo antes de escolher a peça.
          </div>
        </Container>
      </section>
    </>
  )
}
