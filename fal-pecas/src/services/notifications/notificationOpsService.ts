import { getSupabase } from '@/lib/supabase'

export type NotificationDelivery = {
  id: string
  sourceEventId: string
  recipientProfileId: string
  channel: string
  kind: string
  orderId: string | null
  audience: 'customer' | 'staff'
  status: string
  attempts: number
  lastError: string | null
  providerRef: string | null
  notificationId: string | null
  createdAt: string
  updatedAt: string
  sentAt: string | null
}

export type NotificationChannelConfig = {
  channel: string
  enabled: boolean
  provider: string | null
  notes: string | null
  updatedAt: string
}

export type NotificationKindCatalogRow = {
  kind: string
  notifyCustomer: boolean
  notifyStaff: boolean
  severity: string
  mandatory: boolean
  enabled: boolean
  channels: string[]
  staffTitle: string | null
}

function mapDelivery(r: Record<string, unknown>): NotificationDelivery {
  return {
    id: String(r.id),
    sourceEventId: String(r.source_event_id),
    recipientProfileId: String(r.recipient_profile_id),
    channel: String(r.channel),
    kind: String(r.kind),
    orderId: r.order_id != null ? String(r.order_id) : null,
    audience: r.audience === 'staff' ? 'staff' : 'customer',
    status: String(r.status),
    attempts: Number(r.attempts ?? 0),
    lastError: r.last_error != null ? String(r.last_error) : null,
    providerRef: r.provider_ref != null ? String(r.provider_ref) : null,
    notificationId: r.notification_id != null ? String(r.notification_id) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    sentAt: r.sent_at != null ? String(r.sent_at) : null,
  }
}

export async function listNotificationDeliveries(opts?: {
  limit?: number
  status?: string
  channel?: string
}): Promise<NotificationDelivery[]> {
  const limit = opts?.limit ?? 80
  let q = getSupabase()
    .from('notification_deliveries')
    .select(
      'id, source_event_id, recipient_profile_id, channel, kind, order_id, audience, status, attempts, last_error, provider_ref, notification_id, created_at, updated_at, sent_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (opts?.status) q = q.eq('status', opts.status)
  if (opts?.channel) q = q.eq('channel', opts.channel)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((row) => mapDelivery(row as Record<string, unknown>))
}

export async function listNotificationChannelConfig(): Promise<NotificationChannelConfig[]> {
  const { data, error } = await getSupabase()
    .from('notification_channel_config')
    .select('channel, enabled, provider, notes, updated_at')
    .order('channel')
  if (error) throw error
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>
    return {
      channel: String(row.channel),
      enabled: Boolean(row.enabled),
      provider: row.provider != null ? String(row.provider) : null,
      notes: row.notes != null ? String(row.notes) : null,
      updatedAt: String(row.updated_at),
    }
  })
}

export async function listNotificationKindCatalog(): Promise<NotificationKindCatalogRow[]> {
  const { data, error } = await getSupabase()
    .from('notification_kind_catalog')
    .select(
      'kind, notify_customer, notify_staff, severity, mandatory, enabled, channels, staff_title',
    )
    .order('kind')
  if (error) throw error
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>
    const channels = Array.isArray(row.channels)
      ? (row.channels as unknown[]).map(String)
      : []
    return {
      kind: String(row.kind),
      notifyCustomer: Boolean(row.notify_customer),
      notifyStaff: Boolean(row.notify_staff),
      severity: String(row.severity),
      mandatory: Boolean(row.mandatory),
      enabled: Boolean(row.enabled),
      channels,
      staffTitle: row.staff_title != null ? String(row.staff_title) : null,
    }
  })
}

export async function reprocessNotificationDelivery(deliveryId: string): Promise<void> {
  const { error } = await getSupabase().rpc('reprocess_notification_delivery', {
    p_delivery_id: deliveryId,
  })
  if (error) throw error
}
