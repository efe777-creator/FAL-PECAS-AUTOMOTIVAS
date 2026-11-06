import { resolveCategoryIcon } from '@/lib/categoryEmoji'
import type { Category } from '@/types'

export function categoryStatusLabel(status: Category['status']): string {
  if (status === 'archived') return 'Arquivado'
  if (status === 'published') return 'Publicado'
  if (status === 'draft') return 'Rascunho'
  return status ?? '—'
}

export function CategoryIconThumb({
  cat,
}: {
  cat: Pick<Category, 'slug' | 'name' | 'emoji'>
}) {
  const icon = resolveCategoryIcon(cat)
  if (icon.type === 'image') {
    return (
      <img src={icon.src} alt={icon.alt} className="h-7 w-7 object-contain" loading="lazy" />
    )
  }
  return <span className="text-xl leading-none">{icon.value}</span>
}
