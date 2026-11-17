import { AddWidgetPanel } from '@/components/admin/dashboard/AddWidgetPanel'
import { DashboardContextualPanel } from '@/components/admin/dashboard/DashboardContextualPanel'
import { DashboardDataProvider, useDashboardData } from '@/components/admin/dashboard/DashboardDataProvider'
import { DashboardLayoutEngine } from '@/components/admin/dashboard/DashboardLayoutEngine'
import {
  DashboardContextualProvider,
  useDashboardContextual,
} from '@/components/admin/dashboard/DashboardContextualContext'
import { OrderRowActionsMenu } from '@/components/admin/orders/OrderRowActionsMenu'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { contextualTitle } from '@/lib/adminDashboardDeepLinks'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { rememberOrdersReturnPath } from '@/lib/adminOrdersNav'
import {
  buildDefaultLayout,
  clearDashboardLayout,
  createInstanceId,
  nextShelfSlot,
  readDashboardLayout,
  writeDashboardLayout,
  type DashboardLayoutFileV1,
  type DashboardLayoutItem,
} from '@/lib/adminDashboardLayout'
import {
  allowedWidgetIdSet,
  boundsMapForRole,
  DEFAULT_LAYOUT_PLACEMENTS,
  defaultWidgetIdsForRole,
  getWidgetMeta,
  listAvailableWidgets,
  widgetAllowedForRole,
} from '@/lib/adminDashboardWidgets'
import {
  DASHBOARD_PERIOD_PRESETS,
  resolveDashboardPeriod,
  type DashboardPeriodPreset,
  type DashboardPeriodRange,
} from '@/lib/adminDashboardPeriod'
import { formatDateTime } from '@/lib/datetime'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function DashboardShell({
  period,
  onPeriodPreset,
}: {
  period: DashboardPeriodRange
  onPeriodPreset: (p: DashboardPeriodPreset) => void
}) {
  const { user } = useAuth()
  const role = user?.role
  const data = useDashboardData()
  const navigate = useNavigate()
  const { contextual, setContextual, openOrder, clearContextual } =
    useDashboardContextual()
  const selectedOrderId =
    contextual?.kind === 'order' ? contextual.orderId : null

  const available = useMemo(() => listAvailableWidgets(role), [role])
  const bounds = useMemo(() => boundsMapForRole(role), [role])

  const [layoutFile, setLayoutFile] = useState<DashboardLayoutFileV1>(() => {
    const b = boundsMapForRole(role)
    const a = allowedWidgetIdSet(role)
    const d = defaultWidgetIdsForRole(role)
    return readDashboardLayout(b, a, d, undefined, DEFAULT_LAYOUT_PLACEMENTS)
  })
  const [editing, setEditing] = useState(false)
  const [draftItems, setDraftItems] = useState<DashboardLayoutItem[] | null>(
    null,
  )
  const [baselineItems, setBaselineItems] = useState<DashboardLayoutItem[]>(
    [],
  )
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    const b = boundsMapForRole(role)
    const a = allowedWidgetIdSet(role)
    const d = defaultWidgetIdsForRole(role)
    const next = readDashboardLayout(b, a, d, undefined, DEFAULT_LAYOUT_PLACEMENTS)
    setLayoutFile(next)
    setEditing(false)
    setDraftItems(null)
    setBaselineItems([])
  }, [role])

  const persist = useCallback(
    (items: DashboardLayoutItem[]) => {
      const b = boundsMapForRole(role)
      const a = allowedWidgetIdSet(role)
      const next = writeDashboardLayout(
        {
          version: 1,
          updatedAt: new Date().toISOString(),
          items,
        },
        b,
        a,
      )
      setLayoutFile(next)
      return next
    },
    [role],
  )

  const workingItems = editing && draftItems ? draftItems : layoutFile.items

  const dirty = useMemo(() => {
    if (!editing || !draftItems) return false
    if (draftItems.length !== baselineItems.length) return true
    const byId = new Map(baselineItems.map((it) => [it.instanceId, it]))
    for (const it of draftItems) {
      const b = byId.get(it.instanceId)
      if (!b) return true
      if (
        b.x !== it.x ||
        b.y !== it.y ||
        b.w !== it.w ||
        b.h !== it.h ||
        b.widgetId !== it.widgetId
      ) {
        return true
      }
    }
    return false
  }, [editing, draftItems, baselineItems])

  const activeIds = useMemo(
    () => new Set(workingItems.map((i) => i.widgetId)),
    [workingItems],
  )

  function filterAllowed(items: DashboardLayoutItem[]) {
    return items.filter((it) => {
      const meta = getWidgetMeta(it.widgetId)
      return meta ? widgetAllowedForRole(meta, role) : false
    })
  }

  function beginEdit() {
    const snap = layoutFile.items.map((it) => ({ ...it }))
    setBaselineItems(snap)
    setDraftItems(snap)
    setEditing(true)
  }

  function handleCancelEdit() {
    setDraftItems(null)
    setBaselineItems([])
    setEditing(false)
    setAddOpen(false)
  }

  function handleSaveEdit() {
    if (!draftItems) {
      handleCancelEdit()
      return
    }
    persist(filterAllowed(draftItems))
    setDraftItems(null)
    setBaselineItems([])
    setEditing(false)
    setAddOpen(false)
  }

  function handleItemsChange(items: DashboardLayoutItem[]) {
    const filtered = filterAllowed(items)
    if (editing) {
      setDraftItems(filtered)
      return
    }
    persist(filtered)
  }

  function handleRemove(instanceId: string) {
    const next = workingItems.filter((i) => i.instanceId !== instanceId)
    if (editing) {
      setDraftItems(next)
      return
    }
    persist(next)
  }

  function handleAdd(widgetId: string) {
    const meta = getWidgetMeta(widgetId)
    if (!meta || !widgetAllowedForRole(meta, role)) return
    if (activeIds.has(widgetId)) return
    const slot = nextShelfSlot(workingItems, meta.defaultSize)
    const item: DashboardLayoutItem = {
      instanceId: createInstanceId(widgetId),
      widgetId,
      x: slot.x,
      y: slot.y,
      w: slot.w,
      h: slot.h,
    }
    const next = [...workingItems, item]
    if (editing) {
      setDraftItems(next)
      return
    }
    persist(next)
  }

  function handleReset() {
    clearDashboardLayout()
    const b = boundsMapForRole(role)
    const a = allowedWidgetIdSet(role)
    const d = defaultWidgetIdsForRole(role)
    const fresh = buildDefaultLayout(d, b, DEFAULT_LAYOUT_PLACEMENTS)
    const saved = writeDashboardLayout(fresh, b, a)
    setLayoutFile(saved)
    setDraftItems(null)
    setBaselineItems([])
    setEditing(false)
  }

  function openFull(id: string) {
    rememberOrdersReturnPath('/admin')
    navigate(`/admin/pedidos/${id}`)
  }

  const primary = (
    <div
      className={[
        'mx-auto max-w-7xl space-y-5',
        editing ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:pb-5' : '',
      ].join(' ')}
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-fal-fg md:text-3xl">
              Painel
            </h1>
            {editing ? (
              <span className="rounded-md bg-fal-accent/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-fal-accent">
                Editando
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-fal-muted">
            {editing ? 'Personalizar painel' : 'Centro de comando operacional'}
          </p>
          <p
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-fal-muted"
            aria-live="polite"
          >
            <span
              className={[
                'inline-block size-1.5 rounded-full',
                data.refreshing ? 'animate-pulse bg-fal-warning' : 'bg-fal-success',
              ].join(' ')}
              aria-hidden
            />
            {data.refreshing
              ? 'Atualizando…'
              : data.lastUpdatedAt
                ? `Atualizado ${formatDateTime(data.lastUpdatedAt)}`
                : '—'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex flex-wrap items-center gap-0.5 rounded-xl border border-fal-line bg-fal-surface p-1 shadow-sm"
            role="group"
            aria-label="Período"
          >
            {DASHBOARD_PERIOD_PRESETS.map((p) => {
              const meta = resolveDashboardPeriod(p)
              const active = period.preset === p
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={active}
                  className={[
                    'min-h-9 rounded-lg px-3 text-xs font-semibold transition',
                    active
                      ? 'bg-fal-accent text-white shadow-sm'
                      : 'text-fal-muted hover:bg-fal-bg hover:text-fal-fg',
                  ].join(' ')}
                  onClick={() => onPeriodPreset(p)}
                >
                  {meta.label}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className="inline-flex min-h-10 items-center rounded-xl border border-fal-line bg-fal-surface px-3.5 text-sm font-semibold text-fal-fg shadow-sm hover:border-fal-accent/40"
            onClick={() => data.refresh()}
            disabled={data.refreshing}
          >
            Atualizar
          </button>
          {!editing ? (
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-fal-navy bg-fal-navy px-3.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
              aria-pressed={false}
              onClick={beginEdit}
            >
              Personalizar
            </button>
          ) : (
            <>
              <button
                type="button"
                className="hidden min-h-10 items-center rounded-xl border border-fal-line bg-fal-surface px-3 text-sm font-semibold text-fal-fg sm:inline-flex"
                onClick={() => setAddOpen(true)}
              >
                + Widget
              </button>
              <button
                type="button"
                className="hidden min-h-10 items-center rounded-xl border border-fal-line px-3 text-sm font-semibold text-fal-muted sm:inline-flex"
                onClick={handleReset}
              >
                Reset
              </button>
              <button
                type="button"
                className="hidden min-h-10 items-center rounded-xl border border-fal-line bg-fal-surface px-3.5 text-sm font-semibold text-fal-fg sm:inline-flex"
                onClick={handleCancelEdit}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="hidden min-h-10 items-center rounded-xl border border-fal-accent bg-fal-accent px-3.5 text-sm font-semibold text-white sm:inline-flex disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!dirty}
                onClick={handleSaveEdit}
              >
                Salvar
              </button>
            </>
          )}
        </div>
      </header>

      {editing ? (
        <p
          className="rounded-xl border border-fal-accent/40 bg-fal-accent/10 px-3 py-2 text-sm text-fal-fg"
          role="status"
        >
          Segure o ícone ⋮⋮ e arraste para mudar a posição. No celular a grade fica
          em coluna; no desktop também dá para redimensionar. Alterações só gravam
          ao tocar em Salvar.
        </p>
      ) : null}

      {workingItems.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-fal-line bg-fal-surface px-4 py-8 text-center">
          <p className="m-0 text-sm text-fal-muted">Nenhum widget no layout.</p>
          <button
            type="button"
            className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-fal-accent px-4 text-sm font-bold text-white"
            onClick={() => {
              beginEdit()
              setAddOpen(true)
            }}
          >
            Adicionar widget
          </button>
        </div>
      ) : (
        <DashboardLayoutEngine
          items={workingItems}
          boundsByWidgetId={bounds}
          editing={editing}
          onItemsChange={handleItemsChange}
          onRemove={handleRemove}
        />
      )}

      <AddWidgetPanel
        open={addOpen}
        onClose={() => setAddOpen(false)}
        available={available}
        activeIds={activeIds}
        onAdd={handleAdd}
      />

      {editing ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-fal-line bg-fal-surface/95 px-3 pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur sm:hidden"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="mx-auto flex max-w-7xl gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-fal-line bg-fal-bg text-sm font-bold text-fal-fg"
              onClick={handleCancelEdit}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-fal-line px-3 text-sm font-semibold text-fal-fg"
              onClick={() => setAddOpen(true)}
            >
              +
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-fal-accent text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!dirty}
              onClick={handleSaveEdit}
            >
              Salvar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )

  return (
    <AdaptiveWorkspace
      moduleKey="dashboard"
      primary={primary}
      contextualOpen={!!contextual}
      onContextualOpenChange={(open) => {
        if (!open) clearContextual()
      }}
      contextualTitle={contextual ? contextualTitle(contextual) : 'Detalhe'}
      contextualExtraActions={
        selectedOrderId ? <OrderRowActionsMenu orderId={selectedOrderId} /> : null
      }
      contextual={
        contextual ? (
          <DashboardContextualPanel
            contextual={contextual}
            onClose={clearContextual}
            onOpenOrder={openOrder}
            onOpenFullOrder={openFull}
            onChangeLogisticsFila={(fila) =>
              setContextual({ kind: 'hub-logistics', fila })
            }
          />
        ) : null
      }
    />
  )
}

export function AdminDashboardPage() {
  useDocumentTitle('Painel | Admin FAL')
  const { user } = useAuth()
  const [period, setPeriod] = useState(() => resolveDashboardPeriod('last_7'))

  function onPeriodPreset(preset: DashboardPeriodPreset) {
    setPeriod(resolveDashboardPeriod(preset))
  }

  return (
    <DashboardDataProvider role={user?.role} period={period}>
      <DashboardContextualProvider>
        <DashboardShell period={period} onPeriodPreset={onPeriodPreset} />
      </DashboardContextualProvider>
    </DashboardDataProvider>
  )
}
