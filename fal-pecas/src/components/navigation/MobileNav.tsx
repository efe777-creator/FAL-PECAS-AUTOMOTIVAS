import { useCart } from '@/contexts/CartContext'
import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'min-h-11 min-w-[44px] flex-1 px-0.5 pt-1 text-center text-[10px] leading-tight',
    isActive
      ? '-mt-px border-t-2 border-fal-accent font-extrabold text-fal-accent'
      : 'border-t-2 border-transparent font-semibold text-fal-navy/75 dark:text-fal-fg/75',
  ].join(' ')

export function MobileNav() {
  const { itemCount } = useCart()

  return (
    <nav
      className="fixed right-0 bottom-0 left-0 z-[150] flex justify-around border-t border-fal-line bg-fal-surface px-0.5 py-[7px] pb-[calc(7px+env(safe-area-inset-bottom))] dark:bg-fal-bg lg:hidden"
      aria-label="Navegação mobile"
    >
      <NavLink to="/" end className={linkClass}>
        <b className="block text-[18px]" aria-hidden>
          ⌂
        </b>
        Início
      </NavLink>
      <NavLink to="/catalogo" className={linkClass}>
        <b className="block text-[18px]" aria-hidden>
          ⌕
        </b>
        Catálogo
      </NavLink>
      <NavLink to="/conta/veiculos" className={linkClass}>
        <b className="block text-[18px]" aria-hidden>
          🚗
        </b>
        Garagem
      </NavLink>
      <NavLink to="/carrinho" className={linkClass}>
        <b className="block text-[18px]" aria-hidden>
          🛒{itemCount > 0 ? ` ${itemCount}` : ''}
        </b>
        Carrinho
      </NavLink>
      <NavLink to="/conta" className={linkClass}>
        <b className="block text-[18px]" aria-hidden>
          👤
        </b>
        Conta
      </NavLink>
    </nav>
  )
}
