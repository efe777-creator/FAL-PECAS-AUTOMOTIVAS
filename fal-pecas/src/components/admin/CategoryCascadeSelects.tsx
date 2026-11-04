import type { Category } from '@/types'

export type CategoryCascadeValue = {
  categoriaId: string
  grupoId: string
  subgrupoId: string
}

/** Folha efetiva: subgrupo → grupo → categoria (mesmo critério do formulário). */
export function effectiveCategoryId(v: CategoryCascadeValue): string {
  return v.subgrupoId || v.grupoId || v.categoriaId || ''
}

type Props = {
  categories: Category[]
  value: CategoryCascadeValue
  onChange: (next: CategoryCascadeValue) => void
  /** Prefixo opcional nos ids dos selects (acessibilidade / duplicatas na página). */
  idPrefix?: string
  disabled?: boolean
  emptyLabel?: string
  className?: string
}

/**
 * Cascata Categoria → Grupo → Subgrupo (hierarquia da planilha).
 */
export function CategoryCascadeSelects({
  categories,
  value,
  onChange,
  idPrefix = 'cat',
  disabled = false,
  emptyLabel = '—',
  className,
}: Props) {
  const roots = categories
    .filter((c) => !c.parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
  const grupos = categories
    .filter((c) => c.parentId === value.categoriaId)
    .sort((a, b) => a.name.localeCompare(b.name))
  const subgrupos = categories
    .filter((c) => c.parentId === value.grupoId)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className={className ?? 'grid gap-3 sm:grid-cols-3'}>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-fal-navy">Categoria</span>
        <select
          id={`${idPrefix}-categoria`}
          className="w-full rounded-[10px] border border-fal-line px-3 py-2 disabled:opacity-60"
          value={value.categoriaId}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              categoriaId: e.target.value,
              grupoId: '',
              subgrupoId: '',
            })
          }
        >
          <option value="">{emptyLabel}</option>
          {roots.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-fal-navy">Grupo</span>
        <select
          id={`${idPrefix}-grupo`}
          className="w-full rounded-[10px] border border-fal-line px-3 py-2 disabled:opacity-60"
          value={value.grupoId}
          disabled={disabled || !value.categoriaId}
          onChange={(e) =>
            onChange({
              ...value,
              grupoId: e.target.value,
              subgrupoId: '',
            })
          }
        >
          <option value="">{emptyLabel}</option>
          {grupos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-fal-navy">Subgrupo</span>
        <select
          id={`${idPrefix}-subgrupo`}
          className="w-full rounded-[10px] border border-fal-line px-3 py-2 disabled:opacity-60"
          value={value.subgrupoId}
          disabled={disabled || !value.grupoId}
          onChange={(e) =>
            onChange({
              ...value,
              subgrupoId: e.target.value,
            })
          }
        >
          <option value="">{emptyLabel}</option>
          {subgrupos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
