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
  readDashboardLayout,
  writeDashboardLayout,
  type DashboardLayoutFileV1,
  type DashboardLayoutItem,
} from '@/lib/adminDashboardLayout'
import {
  allowedWidgetIdSet,
  boundsMapForRole,
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
    return readDashboardLayout(b, a, d)
  })
  const [editing, setEditing] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    const b = boundsMapForRole(role)
    const a = allowedWidgetIdSet(role)
    const d = defaultWidgetIdsForRole(role)
    setLayoutFile(readDashboardLayout(b, a, d))
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
    const item: DashboardLayoutItem = {
      instanceId: createInstanceId(widgetId),
      widgetId,
      x: 0,
      y: layoutFile.items.reduce((max, i) => Math.max(max, i.y + i.h), 0),
      w: meta.defaultSize.w,
      h: meta.defaultSize.h,
    }
    persist([...layoutFile.items, item])
  }

  function handleReset() {
    clearDashboardLayout()
    const b = boundsMapForRole(role)
    const a = allowedWidgetIdSet(role)
    const d = defaultWidgetIdsForRole(role)
    const fresh = buildDefaultLayout(d, b)
    const saved = writeDashboardLayout(fresh, b, a)
    setLayoutFile(saved)
    setEditing(false)
  }

  function openFull(id: string) {
    rememberOrdersReturnPath('/admin')
    navigate(`/admin/pedidos/${id}`)
  }

  const primary = (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fal-fg md:text-3xl">Painel</h1>
          <p className="mt-1 max-w-2xl text-sm text-fal-muted md:text-base">
            Centro de comando modular — ver, priorizar e abrir a fila certa. Mutações
            ficam na Central e no detalhe.
          </p>
          <p className="mt-1 text-xs text-fal-muted" aria-live="polite">
            {data.refreshing
              ? 'Atualizando…'
              : data.lastUpdatedAt
                ? `Atualizado ${formatDateTime(data.lastUpdatedAt)}`
                : '—'}
            {role ? ` · ${role}` : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div
            className="flex flex-wrap items-center gap-1 rounded-lg border border-fal-line bg-fal-surface p-1"
            role="group"
            aria-label="Período da série"
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
                    'min-h-9 rounded-md px-2.5 text-xs font-semibold',
                    active
                      ? 'bg-fal-accent text-white'
                      : 'text-fal-muted hover:text-fal-fg',
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
            className="inline-flex min-h-11 items-center rounded-lg border border-fal-line bg-fal-surface px-3 text-sm font-semibold text-fal-fg"
            onClick={() => data.refresh()}
            disabled={data.refreshing}
          >
            Atualizar
          </button>
          <button
            type="button"
            className={[
              'inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold',
              editing
                ? 'border-fal-accent bg-fal-accent text-white'
                : 'border-fal-line bg-fal-surface text-fal-fg',
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
                className="inline-flex min-h-11 items-center rounded-lg border border-fal-line bg-fal-surface px-3 text-sm font-semibold text-fal-fg"
                onClick={() => setAddOpen(true)}
              >
                + Widget
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-lg border border-fal-line px-3 text-sm font-semibold text-fal-muted"
                onClick={handleReset}
              >
                Reset layout
              </button>
            </>
          ) : null}
          <Link
            to="/admin/pedidos"
            className="inline-flex min-h-11 items-center rounded-lg bg-fal-accent px-4 text-sm font-bold text-white hover:opacity-95"
          >
            Abrir Central
          </Link>
        </div>
      </header>

      {editing ? (
        <p
          className="rounded-lg border border-fal-accent/40 bg-fal-accent/10 px-3 py-2 text-sm text-fal-fg"
          role="status"
        >
          Modo personalizar: arraste pelo handle ⋮⋮, redimensione e remova widgets. No
          mobile o arraste fica desligado.
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
