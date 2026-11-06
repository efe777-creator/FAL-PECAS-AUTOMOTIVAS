import { Input } from '@/components/common/Input'

type Props = {
  search: string
  levelFilter: 0 | 1 | 2 | 3
  viewMode: 'tree' | 'list'
  onSearch: (v: string) => void
  onLevelFilter: (v: 0 | 1 | 2 | 3) => void
  onViewMode: (v: 'tree' | 'list') => void
}

/** Busca + filtro de nível + Lista/Árvore da classificação. */
export function CategoriesBrowseBar({
  search,
  levelFilter,
  viewMode,
  onSearch,
  onLevelFilter,
  onViewMode,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[220px] flex-1">
        <Input
          label="Buscar classificação"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Nome, path, slug ou descrição…"
        />
      </div>
      <label className="block text-sm pb-2">
        <span className="mb-1 block font-semibold text-fal-navy">Nível</span>
        <select
          className="rounded-[10px] border border-fal-line bg-white px-3 py-2"
          value={levelFilter}
          onChange={(e) => {
            const v = Number(e.target.value) as 0 | 1 | 2 | 3
            onLevelFilter(v)
            if (v === 2 || v === 3) onViewMode('list')
          }}
        >
          <option value={0}>Todos</option>
          <option value={1}>Só categorias</option>
          <option value={2}>Só grupos</option>
          <option value={3}>Só subgrupos</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-1 pb-2">
        <button
          type="button"
          className={`rounded-md px-3 py-2 text-xs font-bold ${
            viewMode === 'list' ? 'bg-fal-navy text-white' : 'bg-fal-bg text-fal-navy'
          }`}
          onClick={() => onViewMode('list')}
        >
          Lista
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-2 text-xs font-bold ${
            viewMode === 'tree' ? 'bg-fal-navy text-white' : 'bg-fal-bg text-fal-navy'
          }`}
          onClick={() => onViewMode('tree')}
        >
          Árvore
        </button>
      </div>
    </div>
  )
}
