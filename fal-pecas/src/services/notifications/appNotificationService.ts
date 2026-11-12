import { getSupabase } from '@/lib/supabase'

export type AppNotification = {
  id: string
  audience: 'customer' | 'staff'
  channel: string
  orderId: string | null
  sourceEventId: string | null
  kind: string
  title: string
  body: string | null
  href: string
  readAt: string | null
  createdAt: string
}

function mapRow(r: Record<string, unknown>): AppNotification {
  const audience = r.audience === 'staff' ? 'staff' : 'customer'
  return {
    id: String(r.id),
    audience,
    channel: String(r.channel ?? 'in_app'),
    orderId: r.order_id != null ? String(r.order_id) : null,
    sourceEventId: r.source_event_id != null ? String(r.source_event_id) : null,
    kind: String(r.kind),
    title: String(r.title),
    body: r.body != null ? String(r.body) : null,
    href: String(r.href),
    readAt: r.read_at != null ? String(r.read_at) : null,
    createdAt: String(r.created_at),
  }
}

export async function listMyNotifications(opts?: {
  limit?: number
  unreadOnly?: boolean
}): Promise<AppNotification[]> {
  const limit = opts?.limit ?? 50
  let q = getSupabase()
    .from('app_notifications')
    .select(
      'id, audience, channel, order_id, source_event_id, kind, title, body, href, read_at, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (opts?.unreadOnly) q = q.is('read_at', null)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

export async function countUnreadNotifications(): Promise<number> {
  const { count, error } = await getSupabase()
    .from('app_notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)
  if (error) throw error
  return count ?? 0
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await getSupabase().rpc('mark_app_notification_read', { p_id: id })
  if (error) throw error
}

export async function markAllNotificationsRead(): Promise<number> {
  const { data, error } = await getSupabase().rpc('mark_all_app_notifications_read')
  if (error) throw error
  return Number(data ?? 0)
}
