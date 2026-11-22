import { AccountButton } from './AccountButton'
import { CartButton } from './CartButton'
import { Logo } from './Logo'
import { NavBar } from './NavBar'
import { SearchBar } from './SearchBar'
import { StoreThemeToggle } from './StoreThemeToggle'
import { MobileDrawer } from './MobileDrawer'
import { Container } from '@/components/layout/Container'
import { GarageActiveSwitcher } from '@/components/garage/GarageActiveSwitcher'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useAuth } from '@/contexts/AuthContext'
import { useCategories } from '@/hooks/useCatalog'
import type { StoreTheme } from '@/lib/storeTheme'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  theme: StoreTheme
  onThemeToggle: () => void
}

export function Header({ theme, onThemeToggle }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const categories = useCategories()
  const { user } = useAuth()

  useEffect(() => {
    function onCloseNav() {
      setMenuOpen(false)
    }
    window.addEventListener('fal:close-mobile-nav', onCloseNav)
    return () => window.removeEventListener('fal:close-mobile-nav', onCloseNav)
  }, [])

  return (
    <header className="sticky top-0 z-[100] border-b border-fal-line bg-fal-surface shadow-sm dark:bg-fal-bg dark:shadow-none">
      <Container className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 py-2 sm:gap-x-4 sm:py-2.5 lg:grid-cols-[auto_auto_minmax(0,1fr)_auto] lg:min-h-[84px] lg:gap-x-[22px] lg:py-3">
        <Logo />
        <Link
          to="/conta/veiculos"
          className="hidden text-center text-[13px] font-semibold text-fal-navy dark:text-fal-fg lg:block"
          aria-label="Minha Garagem"
        >
          <b className="block text-xl leading-none" aria-hidden>
            🚗
          </b>
          Minha Garagem
        </Link>
        <SearchBar />
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 lg:gap-3">
          {/* Mobile: só menu — tema/garagem/avisos/carrinho no drawer ou MobileNav */}
          <div className="hidden items-center gap-3 lg:flex">
            <StoreThemeToggle theme={theme} onToggle={onThemeToggle} showLabel />
            <GarageActiveSwitcher />
            {user ? (
              <NotificationBell allHref="/conta/avisos" audience="customer" variant="light" />
            ) : null}
            <AccountButton />
            <Link
              className="text-center text-[13px] font-semibold text-fal-navy dark:text-fal-fg"
              to="/conta/pedidos"
            >
              <b className="block text-xl leading-none" aria-hidden>
                📦
              </b>
              Pedidos
            </Link>
            <CartButton />
          </div>
          <button
            type="button"
            className="grid h-11 w-11 min-h-11 min-w-11 place-items-center rounded-[10px] border border-fal-line bg-fal-surface text-lg text-fal-navy dark:bg-fal-surface-2 dark:text-fal-fg lg:hidden"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>
        </div>
      </Container>
      <NavBar />

      <MobileDrawer open={menuOpen} title="Menu" onClose={() => setMenuOpen(false)}>
        <nav className="flex flex-col gap-1 text-sm">
          <div className="mb-2 flex items-center justify-between gap-2 px-3 py-1">
            <span className="text-xs font-bold uppercase tracking-wide text-fal-muted">Aparência</span>
            <StoreThemeToggle theme={theme} onToggle={onThemeToggle} showLabel />
          </div>
          <Link
            to="/"
            className="rounded-[10px] px-3 py-2.5 font-semibold text-fal-navy hover:bg-fal-surface-2 dark:text-fal-fg"
            onClick={() => setMenuOpen(false)}
          >
            Início
          </Link>
          <Link
            to="/catalogo"
            className="rounded-[10px] px-3 py-2.5 font-semibold text-fal-navy hover:bg-fal-surface-2 dark:text-fal-fg"
            onClick={() => setMenuOpen(false)}
          >
            Catálogo / buscar peça
          </Link>
          <Link
            to="/conta/veiculos"
            className="min-h-11 rounded-[10px] px-3 py-2.5 font-semibold text-fal-navy hover:bg-fal-surface-2 dark:text-fal-fg"
            onClick={() => setMenuOpen(false)}
          >
            Minha Garagem
          </Link>
          <div className="px-3 py-2">
            <GarageActiveSwitcher compact />
          </div>
          <Link
            to="/carrinho"
            className="rounded-[10px] px-3 py-2.5 font-semibold text-fal-navy hover:bg-fal-surface-2 dark:text-fal-fg"
            onClick={() => setMenuOpen(false)}
          >
            Carrinho
          </Link>
          <Link
            to="/conta"
            className="rounded-[10px] px-3 py-2.5 font-semibold text-fal-navy hover:bg-fal-surface-2 dark:text-fal-fg"
            onClick={() => setMenuOpen(false)}
          >
            Minha conta
          </Link>
          <Link
            to="/conta/pedidos"
            className="rounded-[10px] px-3 py-2.5 font-semibold text-fal-navy hover:bg-fal-surface-2 dark:text-fal-fg"
            onClick={() => setMenuOpen(false)}
          >
            Meus pedidos
          </Link>
          {user ? (
            <Link
              to="/conta/avisos"
              className="rounded-[10px] px-3 py-2.5 font-semibold text-fal-navy hover:bg-fal-surface-2 dark:text-fal-fg"
              onClick={() => setMenuOpen(false)}
            >
              Notificações
            </Link>
          ) : null}
          {categories.data.length > 0 ? (
            <>
              <p className="mt-3 mb-1 px-3 text-xs font-bold uppercase tracking-wide text-fal-muted">
                Categorias
              </p>
              {categories.data.map((item) => (
                <Link
                  key={item.id}
                  to={`/catalogo?cat=${encodeURIComponent(item.slug)}`}
                  className="rounded-[10px] px-3 py-2 text-fal-navy hover:bg-fal-surface-2 dark:text-fal-fg"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </>
          ) : null}
        </nav>
      </MobileDrawer>
    </header>
  )
}
