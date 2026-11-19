import { DashboardEditingProvider } from '@/components/admin/dashboard/DashboardEditingContext'
import { renderDashboardWidget } from '@/components/admin/dashboard/widgets/DashboardWidgets'
import {
  applyBreakpointOrderToLgLayout,
  DASHBOARD_BP_LG,
  DASHBOARD_BP_MD,
  dashboardBreakpointFromWidth,
  fromRglLayout,
  toRglLayout,
  type DashboardLayoutItem,
} from '@/lib/adminDashboardLayout'
import {
  getWidgetMeta,
  type WidgetMeta,
} from '@/lib/adminDashboardWidgets'
import { useElementWidth } from '@/hooks/useElementWidth'
import { useMemo, useRef } from 'react'
import { verticalCompactor } from 'react-grid-layout/core'
import {
  ResponsiveGridLayout,
  type Layout,
  type LayoutItem,
} from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'

const BREAKPOINTS = { lg: DASHBOARD_BP_LG, md: DASHBOARD_BP_MD, sm: 0 }
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
      // sm: empilha sem inflate agressivo (split/desktop usa md ≥ 520)
      const h = Math.max(it.h, 3)
      const next = { ...it, x: 0, y, w: 1, h }
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
  const interactingRef = useRef(false)
  const pendingLgRef = useRef<LayoutItem[] | null>(null)
  const pendingCurrentRef = useRef<LayoutItem[] | null>(null)
  const itemsRef = useRef(items)
  itemsRef.current = items

  // Largura do container — não o viewport. Drag NÃO depende disso (sintoma A).
  const breakpoint = dashboardBreakpointFromWidth(width)
  const isNarrow = breakpoint === 'sm'
  const dragEnabled = editing
  const resizeEnabled = editing && !isNarrow

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

  function commitFromPending() {
    if (!editing) return
    if (breakpoint === 'lg') {
      const lg = pendingLgRef.current
      if (!lg || lg.length === 0) return
      const next = fromRglLayout(lg, itemsRef.current)
      if (next.length === 0) return
      if (layoutsEqual(next, itemsRef.current)) return
      onItemsChange(next)
      return
    }
    const cur = pendingCurrentRef.current
    if (!cur || cur.length === 0) return
    const ordered = [...cur]
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((c) => c.i)
    const next = applyBreakpointOrderToLgLayout(ordered, itemsRef.current)
    if (layoutsEqual(next, itemsRef.current)) return
    onItemsChange(next)
  }

  function handleLayoutChange(
    current: Layout,
    all: Partial<Record<string, Layout>>,
  ) {
    pendingCurrentRef.current = [...current] as LayoutItem[]
    const lg = [
      ...(all.lg ?? (breakpoint === 'lg' ? current : [])),
    ] as LayoutItem[]
    if (lg.length > 0) pendingLgRef.current = lg
    if (interactingRef.current) return
    commitFromPending()
  }

  function beginInteract() {
    interactingRef.current = true
  }

  function endInteract() {
    interactingRef.current = false
    commitFromPending()
  }

  return (
    <div ref={containerRef} className="w-full min-w-0">
      {!mounted || width <= 0 ? (
        <p className="text-sm text-fal-muted">Preparando grade…</p>
      ) : (
        <DashboardEditingProvider editing={editing}>
        <ResponsiveGridLayout
          width={width}
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={72}
          margin={[12, 12] as const}
          containerPadding={[0, 0] as const}
          compactor={verticalCompactor}
          dragConfig={{
            enabled: dragEnabled,
            bounded: true,
            handle: '.fal-dash-drag-handle',
            cancel: '.fal-dash-no-drag,a,input,textarea,select',
            threshold: 3,
            allowMobileScroll: true,
          }}
          resizeConfig={{
            enabled: resizeEnabled,
            handles: ['se', 'e', 's'],
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
                  'flex h-full min-h-0 flex-col rounded-[14px] border bg-fal-surface',
                  editing ? 'overflow-visible' : 'overflow-hidden',
                  editing
                    ? 'border-fal-accent/45 bg-fal-accent/[0.04] shadow-md ring-1 ring-fal-accent/20'
                    : 'border-fal-line/80 shadow-sm',
                ].join(' ')}
              >
                {editing ? (
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-fal-accent/25 bg-fal-bg/90 px-1.5 py-1.5">
                    <div
                      className="fal-dash-drag-handle flex min-h-11 min-w-0 flex-1 cursor-grab touch-none items-center gap-2 rounded-md px-2 py-1.5 text-xs font-bold text-fal-fg select-none hover:bg-fal-surface-2 active:cursor-grabbing"
                      title="Arrastar para reorganizar"
                      aria-label={`Mover ${meta?.title ?? item.widgetId}`}
                      role="button"
                      tabIndex={0}
                      style={{ touchAction: 'none' }}
                    >
                      <span
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-fal-line bg-fal-surface text-base leading-none text-fal-muted"
                        aria-hidden
                      >
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
                    'min-h-0 flex-1 overflow-hidden',
                    editing ? 'fal-dash-no-drag p-2' : 'p-2.5',
                  ].join(' ')}
                >
                  {renderDashboardWidget(item.widgetId)}
                </div>
              </div>
            )
          })}
        </ResponsiveGridLayout>
        </DashboardEditingProvider>
      )}
    </div>
  )
}
