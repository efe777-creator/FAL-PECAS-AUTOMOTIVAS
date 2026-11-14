import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { NotificationInbox } from '@/components/notifications/NotificationInbox'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { resolveNotificationNavHref } from '@/lib/appNotificationCopy'
import { getSupabase } from '@/lib/supabase'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  countUnreadNotifications,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/services/notifications/appNotificationService'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function AccountNotificationsPage() {
  useDocumentTitle('Notificações | FAL Peças Automotivas')
  const navigate = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState<AppNotification[]>([])
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [list, unread] = await Promise.all([
        listMyNotifications({ audience: 'customer', limit: 100 }),
        countUnreadNotifications('customer'),
      ])
      setItems(list)
      setUnreadTotal(unread)
      setError(null)
    } catch (e) {
      setError(toUserMessage(e, 'Erro ao carregar notificações'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!user?.id) return
    const sb = getSupabase()
    const channel = sb
      .channel(`app-notif-page:customer:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_notifications',
          filter: `recipient_profile_id=eq.${user.id}`,
        },
        () => {
          void reload()
        },
      )
      .subscribe()
    return () => {
      void sb.removeChannel(channel)
    }
  }, [user?.id, reload])

  async function openOne(n: AppNotification) {
    setBusy(true)
    const href = resolveNotificationNavHref({
      href: n.href,
      kind: n.kind,
      audience: n.audience,
    })
    try {
      if (!n.readAt) await markNotificationRead(n.id)
      navigate(href)
    } catch {
      navigate(href)
    } finally {
      setBusy(false)
    }
  }

  async function markAll() {
    setBusy(true)
    try {
      await markAllNotificationsRead('customer')
      await reload()
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loading label="Carregando notificações…" />
  if (error) return <ErrorState message={error} />

  return (
    <NotificationInbox
      eyebrow="Minha conta"
      title="Notificações"
      items={items}
      unreadTotal={unreadTotal}
      busy={busy}
      emptyActionLabel="Meus pedidos"
      emptyActionTo="/conta/pedidos"
      emptyDescription="Quando o status do pedido mudar ou a loja pedir sua decisão, o aviso aparece aqui."
      onOpen={(n) => void openOne(n)}
      onMarkAll={() => void markAll()}
    />
  )
}
