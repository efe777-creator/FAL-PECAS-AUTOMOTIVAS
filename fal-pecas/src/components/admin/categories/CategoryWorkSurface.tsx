import {
  CategoriesEditorForm,
  type CreateLevel,
} from '@/components/admin/categories/CategoriesEditorForm'
import type { Category } from '@/types'
import type { FormEvent, RefObject } from 'react'

type Props = {
  formRef: RefObject<HTMLFormElement | null>
  nameInputRef: RefObject<HTMLInputElement | null>
  measuresSectionRef: RefObject<HTMLDivElement | null>
  items: Category[]
  editing: Category | null
  createLevel: CreateLevel
  name: string
  description: string
  parentId: string
  subgrupoCategoriaId: string
  sortOrder: string
  emoji: string
  defaultWeightKg: string
  defaultLengthCm: string
  defaultWidthCm: string
  defaultHeightCm: string
  resultingDepth: number
  categoriaOptions: Category[]
  parentOptions: Category[]
  busyId: string | null
  busyApplyMeasures: boolean
  childrenCount: (parentId: string) => number
  onClose: () => void
  onSubmit: (e: FormEvent) => void
  onStartCreate: (level: CreateLevel) => void
  onReset: () => void
  onDelete: (cat: Category) => void
  onApplyDefaultMeasures: () => void
  onName: (v: string) => void
  onDescription: (v: string) => void
  onParentId: (v: string) => void
  onSubgrupoCategoriaId: (v: string) => void
  onSortOrder: (v: string) => void
  onEmoji: (v: string) => void
  onDefaultWeightKg: (v: string) => void
  onDefaultLengthCm: (v: string) => void
  onDefaultWidthCm: (v: string) => void
  onDefaultHeightCm: (v: string) => void
}

/**
 * Superfície contextual do hub Classificação (Adaptive).
 * Create/edit na guia — formulário não fica permanente no primary.
 */
export function CategoryWorkSurface({
  onClose,
  editing,
  createLevel,
  ...formProps
}: Props) {
  const title = editing
    ? `Editar · ${editing.name}`
    : createLevel === 1
      ? 'Nova categoria na guia'
      : createLevel === 2
        ? 'Novo grupo na guia'
        : 'Novo subgrupo na guia'

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3" data-category-ops-density="compact">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fal-line pb-2">
        <p className="m-0 text-xs font-semibold text-fal-muted">{title}</p>
        <button
          type="button"
          className="text-xs font-semibold text-fal-muted underline"
          onClick={onClose}
        >
          Fechar guia
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto fal-admin-scroll">
        <CategoriesEditorForm
          editing={editing}
          createLevel={createLevel}
          {...formProps}
        />
      </div>
    </div>
  )
}
