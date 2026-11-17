import type { WidgetMeta } from '@/lib/adminDashboardWidgets'

type Props = {
  available: WidgetMeta[]
  activeIds: ReadonlySet<string>
  open: boolean
  onClose: () => void
  onAdd: (widgetId: string) => void
}

const CATEGORY_LABEL: Record<string, string> = {
  operacional: 'Operacional',
  financeiro: 'Financeiro',
  comercial: 'Comercial',
  sistema: 'Sistema',
}

export function AddWidgetPanel({
  available,
  activeIds,
  open,
  onClose,
  onAdd,
}: Props) {
  if (!open) return null

  const addable = available.filter((w) => !activeIds.has(w.id))
  const byCat = new Map<string, WidgetMeta[]>()
  for (const w of addable) {
    const list = byCat.get(w.category) ?? []
    list.push(w)
    byCat.set(w.category, list)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-widget-title"
    >
      <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-[14px] border border-fal-line bg-fal-surface p-4 shadow-lg">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2
              id="add-widget-title"
              className="m-0 text-lg font-extrabold text-fal-fg"
            >
              Adicionar widget
            </h2>
            <p className="mt-1 mb-0 text-xs text-fal-muted">
              Só aparecem widgets autorizados para o seu papel.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-fal-line px-3 py-2 text-sm font-semibold text-fal-fg"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
        {addable.length === 0 ? (
          <p className="m-0 text-sm text-fal-muted">
            Todos os widgets disponíveis já estão no Painel.
          </p>
        ) : (
          <div className="space-y-4">
            {[...byCat.entries()].map(([cat, widgets]) => (
              <section key={cat}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fal-muted">
                  {CATEGORY_LABEL[cat] ?? cat}
                </h3>
                <ul className="m-0 list-none space-y-2 p-0">
                  {widgets.map((w) => (
                    <li key={w.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col items-start rounded-lg border border-fal-line bg-fal-bg px-3 py-2 text-left hover:border-fal-accent/50"
                        onClick={() => {
                          onAdd(w.id)
                          onClose()
                        }}
                      >
                        <span className="text-sm font-bold text-fal-fg">
                          {w.title}
                        </span>
                        <span className="text-xs text-fal-muted">
                          {w.description}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
