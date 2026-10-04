import { getSupabase } from '@/lib/supabase'
import { adminOrderStatusCounts } from '@/services/admin/adminOrderService'

export interface AdminBasicTotals {
  ordersTotal: number
  ordersOpen: number
  ordersDelivered: number
  ordersCancelled: number
  revenueDelivered: number
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

export async function adminReportsBundle() {
  const [counts, totals] = await Promise.all([adminOrderStatusCounts(), adminBasicTotals()])
  return { counts, totals }
}
