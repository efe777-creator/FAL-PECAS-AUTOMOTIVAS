import type { Category } from '@/types'
import { Link } from 'react-router-dom'

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      to={`/catalogo?cat=${encodeURIComponent(category.slug)}`}
      className="rounded-fal border border-fal-line bg-white p-[15px] transition hover:-translate-y-1 hover:shadow-fal sm:p-[22px]"
    >
      <div className="text-[30px] sm:text-[38px]">{category.emoji ?? '📦'}</div>
      <h3 className="mt-3 mb-1.5 text-[15px] sm:text-lg">{category.name}</h3>
      <small className="text-[11px] text-fal-muted sm:text-sm">{category.description}</small>
    </Link>
  )
}
