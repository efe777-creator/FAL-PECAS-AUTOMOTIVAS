import { AccountButton } from './AccountButton'
import { CartButton } from './CartButton'
import { Logo } from './Logo'
import { NavBar } from './NavBar'
import { SearchBar } from './SearchBar'
import { Container } from '@/components/layout/Container'
import { Link } from 'react-router-dom'

export function Header() {
  return (
    <header className="sticky top-0 z-[100] border-b border-fal-line bg-white">
      <Container className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 py-2 sm:gap-x-4 sm:py-2.5 lg:grid-cols-[180px_minmax(0,1fr)_auto] lg:min-h-[84px] lg:gap-x-[22px] lg:py-3">
        <Logo />
        <SearchBar />
        <div className="hidden items-center gap-4 lg:flex">
          <AccountButton />
          <Link className="text-center text-[13px] text-fal-navy" to="/pedidos">
            <b className="block text-xl">📦</b>
            Pedidos
          </Link>
          <CartButton />
        </div>
      </Container>
      <NavBar />
    </header>
  )
}
