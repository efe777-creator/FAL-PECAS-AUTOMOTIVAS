import { Container } from '@/components/layout/Container'
import { useCategories } from '@/hooks/useCatalog'
import { Link } from 'react-router-dom'

const linkCls =
  'shrink-0 whitespace-nowrap border-b-2 border-transparent px-[15px] py-[13px] text-sm font-semibold text-white transition hover:border-fal-yellow hover:bg-white/10 focus-visible:border-fal-yellow focus-visible:outline-none'

export function NavBar() {
  const categories = useCategories()

  return (
    <nav className="hidden bg-fal-navy-dark text-white lg:block">
      <Container className="flex flex-nowrap items-center gap-1 overflow-x-auto">
        <Link
          to="/"
          className="grid h-[46px] w-11 shrink-0 place-items-center border-b-2 border-transparent text-lg transition hover:border-fal-yellow hover:bg-white/10 focus-visible:border-fal-yellow focus-visible:outline-none"
          aria-label="Início"
          title="Início"
        >
          ⌂
        </Link>
        <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-0 overflow-x-auto">
          {categories.data.map((item) => (
            <Link
              key={item.id}
              to={`/catalogo?cat=${encodeURIComponent(item.slug)}`}
              className={linkCls}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </Container>
    </nav>
  )
}
