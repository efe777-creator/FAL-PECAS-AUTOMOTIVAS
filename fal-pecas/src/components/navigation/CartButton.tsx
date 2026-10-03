import { useCart } from '@/contexts/CartContext'
import { Link } from 'react-router-dom'

export function CartButton() {
  const { itemCount } = useCart()
  return (
    <Link className="text-center text-[13px] text-fal-navy" to="/carrinho">
      <b className="block text-xl">
        🛒{' '}
        <span className="rounded-full bg-fal-yellow px-[7px] py-0.5 text-[11px] font-extrabold text-fal-navy-dark">
          {itemCount}
        </span>
      </b>
      Carrinho
    </Link>
  )
}
