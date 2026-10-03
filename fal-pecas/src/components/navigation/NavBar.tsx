import { Container } from '@/components/layout/Container'
import { useCategories } from '@/hooks/useCatalog'
import { Link } from 'react-router-dom'

export function NavBar() {
  const categories = useCategories()

  return (
    <nav className="hidden bg-fal-navy text-white lg:block">
      <Container className="flex flex-wrap items-center gap-1">
        <Link
          to="/"
          className="grid h-[46px] w-11 place-items-center text-lg hover:bg-white/10"
          aria-label="Início"
          title="Início"
        >
          ⌂
        </Link>
        {categories.data.map((item) => (
          <Link
            key={item.id}
            to={`/catalogo?cat=${encodeURIComponent(item.slug)}`}
            className="px-[15px] py-[13px] text-sm hover:bg-white/10"
          >
            {item.name}
          </Link>
        ))}
        <Link
          to="/#veiculo"
          className="ml-auto bg-fal-yellow px-[15px] py-[13px] text-sm font-extrabold text-fal-navy-dark"
        >
          🚗 Encontre peças para seu veículo
        </Link>
      </Container>
    </nav>
  )
}
