import { useCart } from '@/contexts/CartContext'
import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'min-h-11 min-w-[44px] flex-1 px-0.5 text-center text-[10px] leading-tight',
    isActive ? 'font-extrabold text-fal-navy-dark' : 'text-fal-navy',
  ].join(' ')

export function MobileNav() {
  const { itemCount } = useCart()

  return (
    <nav
      className="fixed right-0 bottom-0 left-0 z-[150] flex justify-around border-t border-fal-line bg-white px-0.5 py-[7px] pb-[calc(7px+env(safe-area-inset-bottom))] lg:hidden"
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
        Buscar
      </NavLink>
      <NavLink to="/conta/veiculos" className={linkClass}>
        <b className="block text-[18px]" aria-hidden>
          🚗
        </b>
        Meus carros
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
