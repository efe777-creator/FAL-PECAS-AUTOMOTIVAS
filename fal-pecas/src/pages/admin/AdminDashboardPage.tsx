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
import { Link, useNavigate } from 'react-router-dom'

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
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    const b = boundsMapForRole(role)
    const a = allowedWidgetIdSet(role)
    const d = defaultWidgetIdsForRole(role)
    setLayoutFile(readDashboardLayout(b, a, d, undefined, DEFAULT_LAYOUT_PLACEMENTS))
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
    },
    [role],
  )

  const activeIds = useMemo(
    () => new Set(layoutFile.items.map((i) => i.widgetId)),
    [layoutFile.items],
  )

  function handleItemsChange(items: DashboardLayoutItem[]) {
    // Revalidação de permissão na montagem/persistência
    const filtered = items.filter((it) => {
      const meta = getWidgetMeta(it.widgetId)
      return meta ? widgetAllowedForRole(meta, role) : false
    })
    persist(filtered)
  }

  function handleRemove(instanceId: string) {
    persist(layoutFile.items.filter((i) => i.instanceId !== instanceId))
  }

  function handleAdd(widgetId: string) {
    const meta = getWidgetMeta(widgetId)
    if (!meta || !widgetAllowedForRole(meta, role)) return
    if (activeIds.has(widgetId)) return
    const slot = nextShelfSlot(layoutFile.items, meta.defaultSize)
    const item: DashboardLayoutItem = {
      instanceId: createInstanceId(widgetId),
      widgetId,
      x: slot.x,
      y: slot.y,
      w: slot.w,
      h: slot.h,
    }
    persist([...layoutFile.items, item])
  }

  function handleReset() {
    clearDashboardLayout()
    const b = boundsMapForRole(role)
    const a = allowedWidgetIdSet(role)
    const d = defaultWidgetIdsForRole(role)
    const fresh = buildDefaultLayout(d, b, DEFAULT_LAYOUT_PLACEMENTS)
    const saved = writeDashboardLayout(fresh, b, a)
    setLayoutFile(saved)
    setEditing(false)
  }

  function openFull(id: string) {
    rememberOrdersReturnPath('/admin')
    navigate(`/admin/pedidos/${id}`)
  }

  const primary = (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-fal-fg md:text-3xl">
            Painel
          </h1>
          <p className="mt-0.5 text-sm text-fal-muted">
            Centro de comando operacional
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
          <button
            type="button"
            className={[
              'inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-semibold shadow-sm',
              editing
                ? 'border-fal-accent bg-fal-accent text-white'
                : 'border-fal-navy bg-fal-navy text-white hover:opacity-95',
            ].join(' ')}
            aria-pressed={editing}
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? 'Concluir' : 'Personalizar'}
          </button>
          {editing ? (
            <>
              <button
                type="button"
                className="inline-flex min-h-10 items-center rounded-xl border border-fal-line bg-fal-surface px-3 text-sm font-semibold text-fal-fg"
                onClick={() => setAddOpen(true)}
              >
                + Widget
              </button>
              <button
                type="button"
                className="inline-flex min-h-10 items-center rounded-xl border border-fal-line px-3 text-sm font-semibold text-fal-muted"
                onClick={handleReset}
              >
                Reset
              </button>
            </>
          ) : null}
        </div>
      </header>

      {editing ? (
        <p
          className="rounded-xl border border-fal-accent/40 bg-fal-accent/10 px-3 py-2 text-sm text-fal-fg"
          role="status"
        >
          Arraste pela barra ⋮⋮ do widget · solte para gravar · redimensione pelos
          cantos · + Widget · Reset. No mobile o arraste fica desligado.
        </p>
      ) : null}

      {layoutFile.items.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-fal-line bg-fal-surface px-4 py-8 text-center">
          <p className="m-0 text-sm text-fal-muted">Nenhum widget no layout.</p>
          <button
            type="button"
            className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-fal-accent px-4 text-sm font-bold text-white"
            onClick={() => {
              setEditing(true)
              setAddOpen(true)
            }}
          >
            Adicionar widget
          </button>
        </div>
      ) : (
        <DashboardLayoutEngine
          items={layoutFile.items}
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
