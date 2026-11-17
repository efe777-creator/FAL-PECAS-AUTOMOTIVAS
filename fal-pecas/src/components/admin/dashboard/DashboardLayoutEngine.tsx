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
import { useMemo, useRef, useState } from 'react'
import { verticalCompactor } from 'react-grid-layout/core'
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

function layoutsEqual(
  a: readonly DashboardLayoutItem[],
  b: readonly DashboardLayoutItem[],
): boolean {
  if (a.length !== b.length) return false
  const byId = new Map(b.map((it) => [it.instanceId, it]))
  for (const item of a) {
    const other = byId.get(item.instanceId)
    if (!other) return false
    if (
      item.x !== other.x ||
      item.y !== other.y ||
      item.w !== other.w ||
      item.h !== other.h ||
      item.widgetId !== other.widgetId
    ) {
      return false
    }
  }
  return true
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
  const interactingRef = useRef(false)
  const pendingLgRef = useRef<LayoutItem[] | null>(null)
  const itemsRef = useRef(items)
  itemsRef.current = items

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

  function commitLgLayout(lg: LayoutItem[] | null | undefined) {
    if (!editing || isMobile) return
    if (!lg || lg.length === 0) return
    const next = fromRglLayout(lg, itemsRef.current)
    if (next.length === 0) return
    if (layoutsEqual(next, itemsRef.current)) return
    onItemsChange(next)
  }

  function handleLayoutChange(
    current: Layout,
    all: Partial<Record<string, Layout>>,
  ) {
    const lg = [...(all.lg ?? (breakpoint === 'lg' ? current : []))] as LayoutItem[]
    if (lg.length > 0) pendingLgRef.current = lg
    // Durante arraste/resize não persiste — evita reset do controlled layout
    if (interactingRef.current) return
    commitLgLayout(pendingLgRef.current)
  }

  function beginInteract() {
    interactingRef.current = true
  }

  function endInteract() {
    interactingRef.current = false
    commitLgLayout(pendingLgRef.current)
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
          margin={[14, 14] as const}
          containerPadding={[0, 0] as const}
          compactor={verticalCompactor}
          dragConfig={{
            enabled: dragEnabled,
            bounded: true,
            // Handle NÃO pode ser <button> se cancel incluir button
            handle: '.fal-dash-drag-handle',
            cancel: '.fal-dash-no-drag,a,input,textarea,select',
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
          onDragStart={beginInteract}
          onDragStop={endInteract}
          onResizeStart={beginInteract}
          onResizeStop={endInteract}
        >
          {items.map((item) => {
            const meta = getWidgetMeta(item.widgetId) as WidgetMeta | undefined
            return (
              <div
                key={item.instanceId}
                className={[
                  'rounded-[14px] border bg-fal-surface',
                  editing ? 'overflow-visible' : 'overflow-hidden',
                  editing
                    ? 'border-fal-accent/35 shadow-sm ring-1 ring-fal-accent/15'
                    : 'border-fal-line/80 shadow-sm',
                ].join(' ')}
              >
                {editing ? (
                  <div className="flex items-center justify-between gap-2 border-b border-fal-line bg-fal-bg/80 px-1.5 py-1.5">
                    <div
                      className="fal-dash-drag-handle flex min-h-9 min-w-0 flex-1 cursor-grab items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold text-fal-fg select-none hover:bg-fal-surface-2 active:cursor-grabbing"
                      title="Arrastar para reorganizar"
                      aria-label={`Mover ${meta?.title ?? item.widgetId}`}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="text-base leading-none text-fal-muted" aria-hidden>
                        ⋮⋮
                      </span>
                      <span className="truncate">
                        {meta?.title ?? item.widgetId}
                      </span>
                      <span className="ml-auto hidden text-[10px] font-semibold uppercase tracking-wide text-fal-muted sm:inline">
                        Arrastar
                      </span>
                    </div>
                    <button
                      type="button"
                      className="fal-dash-no-drag shrink-0 rounded px-2 py-1 text-xs font-bold text-fal-danger hover:bg-fal-danger/10"
                      aria-label={`Remover ${meta?.title ?? item.widgetId}`}
                      onClick={() => onRemove(item.instanceId)}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      Remover
                    </button>
                  </div>
                ) : null}
                <div
                  className={[
                    editing ? 'fal-dash-no-drag p-2.5' : 'h-full p-3',
                    editing ? 'overflow-auto' : '',
                  ].join(' ')}
                >
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
