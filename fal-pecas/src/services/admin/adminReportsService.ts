import { getSupabase } from '@/lib/supabase'
import { adminOrderStatusCounts } from '@/services/admin/adminOrderService'

export interface AdminBasicTotals {
  ordersTotal: number
  ordersOpen: number
  ordersDelivered: number
  ordersCancelled: number
  revenueDelivered: number
}

export type AdminDailySeriesDay = {
  date: string
  ordersCreated: number
  ordersDelivered: number | null
  gmvDelivered: number | null
  captured: number
  refunded: number
  netDay: number
}

export type AdminDailySeries = {
  from: string
  to: string
  timezone: string
  currency: string
  canF8: boolean
  days: AdminDailySeriesDay[]
}

export async function staffCanViewReportsF8(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('staff_can_view_reports_f8')
  if (error) throw error
  return Boolean(data)
}

export async function adminBasicTotals(): Promise<AdminBasicTotals> {
  const { data, error } = await getSupabase().rpc('admin_orders_basic_totals')
  if (error) throw error
  const o = (data ?? {}) as Record<string, number>
  return {
    ordersTotal: Number(o.orders_total ?? 0),
    ordersOpen: Number(o.orders_open ?? 0),
    ordersDelivered: Number(o.orders_delivered ?? 0),
    ordersCancelled: Number(o.orders_cancelled ?? 0),
    revenueDelivered: Number(o.revenue_delivered ?? 0),
  }
}

export async function adminDashboardDailySeries(
  from: string,
  to: string,
): Promise<AdminDailySeries> {
  const { data, error } = await getSupabase().rpc('admin_dashboard_daily_series', {
    p_from: from,
    p_to: to,
  })
  if (error) throw error
  const raw = (data ?? {}) as Record<string, unknown>
  const daysRaw = Array.isArray(raw.days) ? raw.days : []
  return {
    from: String(raw.from ?? from),
    to: String(raw.to ?? to),
    timezone: String(raw.timezone ?? 'America/Sao_Paulo'),
    currency: String(raw.currency ?? 'BRL'),
    canF8: Boolean(raw.can_f8),
    days: daysRaw.map((row) => {
      const r = row as Record<string, unknown>
      return {
        date: String(r.date ?? ''),
        ordersCreated: Number(r.orders_created ?? 0),
        ordersDelivered:
          r.orders_delivered == null ? null : Number(r.orders_delivered),
        gmvDelivered: r.gmv_delivered == null ? null : Number(r.gmv_delivered),
        captured: Number(r.captured ?? 0),
        refunded: Number(r.refunded ?? 0),
        netDay: Number(r.net_day ?? 0),
      }
    }),
  }
}

export async function adminReportsBundle() {
  const [counts, totals] = await Promise.all([adminOrderStatusCounts(), adminBasicTotals()])
  return { counts, totals }
}
