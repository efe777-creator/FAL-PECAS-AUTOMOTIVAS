import {
  CategoryIconThumb,
  categoryStatusLabel,
} from '@/components/admin/categories/categoryAdminUi'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import {
  categoryLevelLabel,
  categoryPath,
  CATEGORY_MAX_DEPTH,
} from '@/services/admin/adminCategoryService'
import type { Category } from '@/types'

export type CategoryFlatRow = {
  cat: Category
  depth: 1 | 2 | 3
  path: string
}

type Props = {
  viewMode: 'tree' | 'list'
  flatRows: CategoryFlatRow[]
  visibleRoots: Category[]
  treeItems: Category[]
  counts: Record<string, number>
  editingId: string | null
  busyId: string | null
  searchQ: string
  expanded: Set<string>
  childrenOf: (id: string) => Category[]
  siblingsOf: (cat: Category) => Category[]
  matchesSearch: (c: Category) => boolean
  nodeOrDescendantMatches: (id: string) => boolean
  onToggleExpanded: (id: string) => void
  onReorder: (cat: Category, direction: 'up' | 'down') => void
  onEdit: (cat: Category) => void
  onAddChild: (cat: Category) => void
  onArchiveToggle: (cat: Category) => void
  onDelete: (cat: Category) => void
  onStartCreateRoot: () => void
}

/** Lista plana + árvore da classificação (extraído da página admin). */
export function CategoriesBrowsePanel({
  viewMode,
  flatRows,
  visibleRoots,
  treeItems,
  counts,
  editingId,
  busyId,
  searchQ,
  expanded,
  childrenOf,
  siblingsOf,
  matchesSearch,
  nodeOrDescendantMatches,
  onToggleExpanded,
  onReorder,
  onEdit,
  onAddChild,
  onArchiveToggle,
  onDelete,
  onStartCreateRoot,
}: Props) {
  function renderNode(cat: Category, depth: number) {
    const kids = childrenOf(cat.id)
    const hasKids = kids.length > 0
    const isOpen = expanded.has(cat.id) || Boolean(searchQ && hasKids)
    const level = categoryLevelLabel(depth)
    const canAddChild = depth < CATEGORY_MAX_DEPTH
    const sibs = siblingsOf(cat)
    const sibIdx = sibs.findIndex((s) => s.id === cat.id)
    const indentPx = (depth - 1) * 20
    const productCount = counts[cat.id] ?? 0
    const highlight =
      searchQ && matchesSearch(cat)
        ? 'bg-fal-yellow/20'
        : editingId === cat.id
          ? 'bg-fal-yellow/15'
          : cat.status === 'archived'
            ? 'opacity-60'
            : ''

    return (
      <div key={cat.id}>
        <div
          className={`flex flex-wrap items-center gap-2 border-t border-fal-line px-3 py-2 text-sm ${highlight}`}
          style={{ paddingLeft: 12 + indentPx }}
        >
          <button
            type="button"
            className="w-6 shrink-0 font-bold text-fal-navy disabled:opacity-30"
            disabled={!hasKids}
            aria-label={isOpen ? 'Recolher' : 'Expandir'}
            onClick={() => onToggleExpanded(cat.id)}
          >
            {hasKids ? (isOpen ? '▾' : '▸') : '·'}
          </button>
          {depth === 1 ? <CategoryIconThumb cat={cat} /> : null}
          <div className="min-w-[160px] flex-1">
            <div
              className={depth === 1 ? 'font-extrabold text-fal-navy' : 'font-semibold text-fal-navy'}
            >
              {cat.name}
            </div>
            <div className="text-xs text-fal-muted">
              {level}
              {cat.description ? ` · ${cat.description}` : ''}
              {' · '}
              {productCount} prod.
            </div>
          </div>
          <span className="hidden text-xs text-fal-muted lg:inline">
            {categoryPath(treeItems, cat.id)}
          </span>
          <span className="text-xs text-fal-muted">#{cat.sortOrder ?? 0}</span>
          <span className="text-xs">{categoryStatusLabel(cat.status)}</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="font-semibold text-fal-navy underline disabled:opacity-40"
              disabled={busyId === cat.id || sibIdx <= 0}
              onClick={() => onReorder(cat, 'up')}
              title="Subir entre irmãos"
            >
              ↑
            </button>
            <button
              type="button"
              className="font-semibold text-fal-navy underline disabled:opacity-40"
              disabled={busyId === cat.id || sibIdx < 0 || sibIdx >= sibs.length - 1}
              onClick={() => onReorder(cat, 'down')}
              title="Descer entre irmãos"
            >
              ↓
            </button>
            <button
              type="button"
              className="font-semibold text-fal-auth-link"
              onClick={() => onEdit(cat)}
            >
              Editar
            </button>
            {canAddChild && cat.status !== 'archived' ? (
              <button
                type="button"
                className="font-semibold text-fal-navy underline"
                onClick={() => onAddChild(cat)}
              >
                + {categoryLevelLabel(depth + 1)}
              </button>
            ) : null}
            <button
              type="button"
              className="font-semibold text-fal-muted"
              disabled={busyId === cat.id}
              onClick={() => onArchiveToggle(cat)}
            >
              {cat.status === 'archived' ? 'Publicar' : 'Arquivar'}
            </button>
            <button
              type="button"
              className="font-semibold text-red-700 underline disabled:opacity-50"
              disabled={busyId === cat.id}
              onClick={() => onDelete(cat)}
            >
              Excluir
            </button>
          </div>
        </div>
        {hasKids && isOpen
          ? kids
              .filter(
                (ch) =>
                  !searchQ ||
                  matchesSearch(ch) ||
                  nodeOrDescendantMatches(ch.id) ||
                  matchesSearch(cat),
              )
              .map((ch) => renderNode(ch, depth + 1))
          : null}
      </div>
    )
  }

  return (
    <div className="rounded-[14px] border border-fal-line bg-white">
      <div className="flex flex-wrap gap-4 border-b border-fal-line bg-fal-bg px-3 py-2 text-xs font-extrabold text-fal-muted">
        <span>Categoria</span>
        <span>→ Grupo</span>
        <span>→ Subgrupo</span>
        <span className="font-normal">
          · {viewMode === 'list' ? 'Lista plana' : 'Árvore'} · import + manual
        </span>
      </div>
      {viewMode === 'list' ? (
        flatRows.length === 0 ? (
          <div className="px-3 py-4">
            <EmptyState
              title="Nenhuma classificação encontrada"
              description="Ajuste o filtro de nível ou limpe a busca. Arquivados ficam no link “Ver arquivados” do resumo acima."
            >
              <div className="mt-4 flex justify-center gap-2">
                <Button type="button" onClick={onStartCreateRoot}>
                  + Criar categoria
                </Button>
              </div>
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-fal-bg text-xs font-extrabold uppercase text-fal-muted">
                <tr>
                  <th className="px-3 py-2">Nível</th>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Caminho</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Prod.</th>
                  <th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {flatRows.map(({ cat, depth, path }) => (
                  <tr
                    key={cat.id}
                    className={`border-t border-fal-line ${
                      editingId === cat.id
                        ? 'bg-fal-yellow/15'
                        : cat.status === 'archived'
                          ? 'bg-amber-50/80'
                          : ''
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-fal-muted">
                      {categoryLevelLabel(depth)}
                    </td>
                    <td className="px-3 py-2 font-semibold text-fal-navy">
                      <span className="inline-flex items-center gap-2">
                        {depth === 1 ? <CategoryIconThumb cat={cat} /> : null}
                        {cat.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-fal-muted">{path}</td>
                    <td className="px-3 py-2 text-xs">{categoryStatusLabel(cat.status)}</td>
                    <td className="px-3 py-2 text-xs">{counts[cat.id] ?? 0}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="font-semibold text-fal-auth-link"
                          onClick={() => onEdit(cat)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="font-semibold text-fal-muted"
                          disabled={busyId === cat.id}
                          onClick={() => onArchiveToggle(cat)}
                        >
                          {cat.status === 'archived' ? 'Publicar' : 'Arquivar'}
                        </button>
                        {depth < CATEGORY_MAX_DEPTH && cat.status !== 'archived' ? (
                          <button
                            type="button"
                            className="font-semibold text-fal-navy underline"
                            onClick={() => onAddChild(cat)}
                          >
                            + {categoryLevelLabel(depth + 1)}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : visibleRoots.length === 0 ? (
        <div className="px-3 py-4">
          <EmptyState
            title="Nenhuma classificação encontrada"
            description="Limpe a busca. Arquivados ficam no link “Ver arquivados” do resumo acima."
          >
            <div className="mt-4 flex justify-center gap-2">
              <Button type="button" onClick={onStartCreateRoot}>
                + Criar categoria
              </Button>
            </div>
          </EmptyState>
        </div>
      ) : (
        visibleRoots.map((root) => renderNode(root, 1))
      )}
    </div>
  )
}
