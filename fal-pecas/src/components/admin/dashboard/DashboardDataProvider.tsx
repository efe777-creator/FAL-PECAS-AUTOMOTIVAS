import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { canAccessAdminPath } from '@/lib/adminNavAccess'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  ADMIN_LIST_PAGE_SIZE,
  adminCentralIndicators,
  adminListOrders,
  adminLogisticsQueueCounts,
  adminOrderStatusCounts,
  type AdminCentralIndicators,
  type AdminOrderListRow,
} from '@/services/admin/adminOrderService'
import {
  adminBasicTotals,
  adminDashboardDailySeries,
  staffCanViewReportsF8,
  type AdminBasicTotals,
  type AdminDailySeries,
} from '@/services/admin/adminReportsService'
import type { LogisticsQueueCounts } from '@/lib/adminLogisticsQueues'
import {
  ATTENTION_STATUSES,
  adminActorKind,
  attentionSortKey,
  isAttentionOrder,
} from '@/lib/adminOrderOps'
import type { DashboardDataSourceId } from '@/lib/adminDashboardWidgets'
import type { DashboardPeriodRange } from '@/lib/adminDashboardPeriod'

export { ATTENTION_STATUSES }

export type SourceStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error'

export type SourceState<T> = {
  status: SourceStatus
  data: T | null
  error: string | null
}

type DashboardDataValue = {
  role: string | null | undefined
  period: DashboardPeriodRange
  lastUpdatedAt: string | null
  refreshing: boolean
  refresh: () => void
  statusCounts: SourceState<Record<string, number>>
  attention: SourceState<AdminOrderListRow[]>
  centralIndicators: SourceState<AdminCentralIndicators>
  logisticsQueues: SourceState<LogisticsQueueCounts>
  basicTotals: SourceState<AdminBasicTotals>
  dailySeries: SourceState<AdminDailySeries>
  teamCount: number
  customerCount: number
  firstAttention: AdminOrderListRow | null
  sourceOf: (id: DashboardDataSourceId) => SourceState<unknown>
}

const DashboardDataContext = createContext<DashboardDataValue | null>(null)

function emptySource<T>(): SourceState<T> {
  return { status: 'idle', data: null, error: null }
}

function loadingSource<T>(prev: SourceState<T>): SourceState<T> {
  return { ...prev, status: 'loading', error: null }
}

export function DashboardDataProvider({
  role,
  period,
  children,
}: {
  role: string | null | undefined
  period: DashboardPeriodRange
  children: ReactNode
}) {
  const [statusCounts, setStatusCounts] =
    useState<SourceState<Record<string, number>>>(emptySource)
  const [attention, setAttention] =
    useState<SourceState<AdminOrderListRow[]>>(emptySource)
  const [centralIndicators, setCentralIndicators] =
    useState<SourceState<AdminCentralIndicators>>(emptySource)
  const [logisticsQueues, setLogisticsQueues] =
    useState<SourceState<LogisticsQueueCounts>>(emptySource)
  const [basicTotals, setBasicTotals] =
    useState<SourceState<AdminBasicTotals>>(emptySource)
  const [dailySeries, setDailySeries] =
    useState<SourceState<AdminDailySeries>>(emptySource)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [tick, setTick] = useState(0)

  const canCash =
    canAccessAdminPath('/admin/pagamentos', role) ||
    canAccessAdminPath('/admin/relatorios', role)
  const canReports = canAccessAdminPath('/admin/relatorios', role)
  const canSeries = canCash || canReports
  const canLogistics =
    canAccessAdminPath('/admin/logistica', role) ||
    canAccessAdminPath('/admin/pedidos', role)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setRefreshing(true)
      setStatusCounts((s) => loadingSource(s))
      setAttention((s) => loadingSource(s))
      if (canCash) setCentralIndicators((s) => loadingSource(s))
      else setCentralIndicators(emptySource())
      if (canLogistics) setLogisticsQueues((s) => loadingSource(s))
      else setLogisticsQueues(emptySource())
      setBasicTotals((s) => loadingSource(s))
      if (canSeries) setDailySeries((s) => loadingSource(s))
      else setDailySeries(emptySource())

      const countsP = adminOrderStatusCounts()
        .then((data) => {
          if (cancelled) return
          const empty = Object.values(data).every((n) => !n)
          setStatusCounts({
            status: empty ? 'empty' : 'success',
            data,
            error: null,
          })
        })
        .catch((e) => {
          if (cancelled) return
          setStatusCounts({
            status: 'error',
            data: null,
            error: toUserMessage(e, 'Falha ao carregar contagens'),
          })
        })

      const attentionP = adminListOrders(null, {
        statuses: ATTENTION_STATUSES,
        limit: ADMIN_LIST_PAGE_SIZE,
      })
        .then((list) => {
          if (cancelled) return
          const rows = list
            .filter((o) => isAttentionOrder(o.status, o.customerDecision))
            .sort((a, b) => {
              const ka = attentionSortKey(a.status, a.customerDecision)
              const kb = attentionSortKey(b.status, b.customerDecision)
              if (ka !== kb) return ka - kb
              return b.createdAt.localeCompare(a.createdAt)
            })
            .slice(0, 12)
          setAttention({
            status: rows.length === 0 ? 'empty' : 'success',
            data: rows,
            error: null,
          })
        })
        .catch((e) => {
          if (cancelled) return
          setAttention({
            status: 'error',
            data: null,
            error: toUserMessage(e, 'Falha ao carregar atenção'),
          })
        })

      const cashP = canCash
        ? adminCentralIndicators()
            .then((data) => {
              if (cancelled) return
              setCentralIndicators({ status: 'success', data, error: null })
            })
            .catch((e) => {
              if (cancelled) return
              setCentralIndicators({
                status: 'error',
                data: null,
                error: toUserMessage(e, 'Falha ao carregar caixa'),
              })
            })
        : Promise.resolve()

      const logisticsP = canLogistics
        ? adminLogisticsQueueCounts()
            .then((data) => {
              if (cancelled) return
              setLogisticsQueues({ status: 'success', data, error: null })
            })
            .catch((e) => {
              if (cancelled) return
              setLogisticsQueues({
                status: 'error',
                data: null,
                error: toUserMessage(e, 'Falha ao carregar filas'),
              })
            })
        : Promise.resolve()

      const totalsP = staffCanViewReportsF8()
        .catch(() => false)
        .then(async (can) => {
          if (cancelled) return
          if (!can) {
            setBasicTotals(emptySource())
            return
          }
          try {
            const data = await adminBasicTotals()
            if (cancelled) return
            setBasicTotals({ status: 'success', data, error: null })
          } catch (e) {
            if (cancelled) return
            setBasicTotals({
              status: 'error',
              data: null,
              error: toUserMessage(e, 'Falha ao carregar totais'),
            })
          }
        })

      const seriesP = canSeries
        ? adminDashboardDailySeries(period.from, period.to)
            .then((data) => {
              if (cancelled) return
              const empty = data.days.length === 0
              setDailySeries({
                status: empty ? 'empty' : 'success',
                data,
                error: null,
              })
            })
            .catch((e) => {
              if (cancelled) return
              setDailySeries({
                status: 'error',
                data: null,
                error: toUserMessage(e, 'Falha ao carregar série diária'),
              })
            })
        : Promise.resolve()

      await Promise.allSettled([
        countsP,
        attentionP,
        cashP,
        logisticsP,
        totalsP,
        seriesP,
      ])
      if (!cancelled) {
        setLastUpdatedAt(new Date().toISOString())
        setRefreshing(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [role, canCash, canLogistics, canSeries, period.from, period.to, tick])

  const attentionRows = attention.data ?? []
  const teamCount = attentionRows.filter(
    (o) => adminActorKind(o.status, o.customerDecision) === 'team',
  ).length
  const customerCount = attentionRows.filter(
    (o) => adminActorKind(o.status, o.customerDecision) === 'customer',
  ).length
  const firstAttention = attentionRows[0] ?? null

  const value = useMemo<DashboardDataValue>(
    () => ({
      role,
      period,
      lastUpdatedAt,
      refreshing,
      refresh,
      statusCounts,
      attention,
      centralIndicators,
      logisticsQueues,
      basicTotals,
      dailySeries,
      teamCount,
      customerCount,
      firstAttention,
      sourceOf: (id) => {
        switch (id) {
          case 'statusCounts':
            return statusCounts
          case 'attention':
            return attention
          case 'centralIndicators':
            return centralIndicators
          case 'logisticsQueues':
            return logisticsQueues
          case 'basicTotals':
            return basicTotals
          case 'dailySeries':
            return dailySeries
        }
      },
    }),
    [
      role,
      period,
      lastUpdatedAt,
      refreshing,
      refresh,
      statusCounts,
      attention,
      centralIndicators,
      logisticsQueues,
      basicTotals,
      dailySeries,
      teamCount,
      customerCount,
      firstAttention,
    ],
  )

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  )
}

export function useDashboardData(): DashboardDataValue {
  const ctx = useContext(DashboardDataContext)
  if (!ctx) {
    throw new Error('useDashboardData fora de DashboardDataProvider')
  }
  return ctx
}
