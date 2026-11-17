import { renderDashboardWidget } from '@/components/admin/dashboard/widgets/DashboardWidgets'
import {
  fromRglLayout,
  toRglLayout,
  type DashboardLayoutItem,
} from '@/lib/adminDashboardLayout'
import {
  getWidgetMeta,
  type WidgetMeta,
} from '@/lib/adminDashboardWidgets'
import { useElementWidth } from '@/hooks/useElementWidth'
import { useMemo, useState } from 'react'
import {
  ResponsiveGridLayout,
  type Layout,
  type LayoutItem,
} from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'

const BREAKPOINTS = { lg: 1024, md: 768, sm: 0 }
const COLS = { lg: 12, md: 8, sm: 1 }

type Props = {
  items: DashboardLayoutItem[]
  boundsByWidgetId: Map<
    string,
    {
      defaultSize: { w: number; h: number }
      minSize: { w: number; h: number }
      maxSize: { w: number; h: number }
    }
  >
  editing: boolean
  onItemsChange: (items: DashboardLayoutItem[]) => void
  onRemove: (instanceId: string) => void
}

function scaleForBreakpoint(
  items: DashboardLayoutItem[],
  cols: number,
): DashboardLayoutItem[] {
  if (cols >= 12) return items
  if (cols <= 1) {
    let y = 0
    return items.map((it) => {
      const next = { ...it, x: 0, y, w: 1, h: Math.max(it.h, 2) }
      y += next.h
      return next
    })
  }
  const scale = cols / 12
  let y = 0
  let x = 0
  let rowH = 0
  return items.map((it) => {
    const ww = Math.max(2, Math.min(cols, Math.round(it.w * scale) || 2))
    const hh = it.h
    if (x + ww > cols) {
      x = 0
      y += rowH
      rowH = 0
    }
    const placed = { ...it, x, y, w: ww, h: hh }
    x += ww
    rowH = Math.max(rowH, hh)
    return placed
  })
}

export function DashboardLayoutEngine({
  items,
  boundsByWidgetId,
  editing,
  onItemsChange,
  onRemove,
}: Props) {
  const { width, containerRef, mounted } = useElementWidth(1280)
  const [breakpoint, setBreakpoint] = useState<'lg' | 'md' | 'sm'>('lg')

  const isMobile = breakpoint === 'sm'
  const dragEnabled = editing && !isMobile
  const resizeEnabled = editing && !isMobile

  const layouts = useMemo(() => {
    const lgItems = items
    const mdItems = scaleForBreakpoint(items, COLS.md)
    const smItems = scaleForBreakpoint(items, COLS.sm)
    return {
      lg: toRglLayout(lgItems, boundsByWidgetId) as Layout,
      md: toRglLayout(mdItems, boundsByWidgetId) as Layout,
      sm: toRglLayout(smItems, boundsByWidgetId) as Layout,
    }
  }, [items, boundsByWidgetId])

  function handleLayoutChange(
    current: Layout,
    all: Partial<Record<string, Layout>>,
  ) {
    if (!editing || isMobile) return
    // Persist from lg layout (canonical 12-col)
    const lg = [...(all.lg ?? current)] as LayoutItem[]
    const next = fromRglLayout(lg, items)
    if (next.length === 0) return
    onItemsChange(next)
  }

  return (
    <div ref={containerRef} className="w-full min-w-0">
      {!mounted || width <= 0 ? (
        <p className="text-sm text-fal-muted">Preparando grade…</p>
      ) : (
        <ResponsiveGridLayout
          width={width}
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={56}
          margin={[12, 12] as const}
          containerPadding={[0, 0] as const}
          dragConfig={{
            enabled: dragEnabled,
            bounded: true,
            handle: '.fal-dash-drag-handle',
            cancel: 'a,button,input,textarea,select',
            threshold: 3,
          }}
          resizeConfig={{
            enabled: resizeEnabled,
            handles: ['se', 'e', 's'],
          }}
          onBreakpointChange={(bp) => {
            if (bp === 'lg' || bp === 'md' || bp === 'sm') setBreakpoint(bp)
          }}
          onLayoutChange={handleLayoutChange}
        >
          {items.map((item) => {
            const meta = getWidgetMeta(item.widgetId) as WidgetMeta | undefined
            return (
              <div
                key={item.instanceId}
                className="overflow-hidden rounded-[14px] border border-fal-line bg-fal-surface shadow-sm"
              >
                {editing ? (
                  <div className="flex items-center justify-between gap-2 border-b border-fal-line bg-fal-bg px-2 py-1">
                    <button
                      type="button"
                      className="fal-dash-drag-handle cursor-grab px-2 py-1 text-xs font-bold text-fal-muted active:cursor-grabbing"
                      aria-label={`Mover ${meta?.title ?? item.widgetId}`}
                    >
                      ⋮⋮ {meta?.title ?? item.widgetId}
                    </button>
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-xs font-bold text-fal-danger hover:bg-fal-danger/10"
                      aria-label={`Remover ${meta?.title ?? item.widgetId}`}
                      onClick={() => onRemove(item.instanceId)}
                    >
                      Remover
                    </button>
                  </div>
                ) : null}
                <div className={editing ? 'p-2' : 'h-full p-2'}>
                  {renderDashboardWidget(item.widgetId)}
                </div>
              </div>
            )
          })}
        </ResponsiveGridLayout>
      )}
    </div>
  )
}
