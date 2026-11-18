import { AdminTabs } from '@/components/admin/AdminTabs'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { NotificationInbox } from '@/components/notifications/NotificationInbox'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { resolveNotificationNavHref } from '@/lib/appNotificationCopy'
import { formatDateTime } from '@/lib/datetime'
import { categoryLabel } from '@/lib/notificationDisplay'
import { emitNotifChanged } from '@/lib/notificationEvents'
import { getSupabase } from '@/lib/supabase'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  countUnreadNotifications,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type AppNotificationCategory,
} from '@/services/notifications/appNotificationService'
import {
  listNotificationChannelConfig,
  listNotificationDeliveries,
  listNotificationKindCatalog,
  reprocessNotificationDelivery,
  type NotificationChannelConfig,
  type NotificationDelivery,
  type NotificationKindCatalogRow,
} from '@/services/notifications/notificationOpsService'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Layer = 'inbox' | 'advanced'
type AdvancedTab = 'deliveries' | 'config'

const CHANNEL_LABEL: Record<string, string> = {
  in_app: 'No site',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  push: 'Push',
}

const STATUS_LABEL: Record<string, string> = {
  sent: 'Enviado',
  failed: 'Falhou',
  skipped: 'Pulado',
  read: 'Lido',
  pending: 'Pendente',
  processing: 'Processando',
}

export function AdminNotificationsPage() {
  useDocumentTitle('Notificações | Admin FAL')
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const [layer, setLayer] = useState<Layer>('inbox')
  const [advancedTab, setAdvancedTab] = useState<AdvancedTab>('deliveries')

  const [items, setItems] = useState<AppNotification[]>([])
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [busy, setBusy] = useState(false)

  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>([])
  const [deliveryStatus, setDeliveryStatus] = useState<string>('')
  const [channels, setChannels] = useState<NotificationChannelConfig[]>([])
  const [kinds, setKinds] = useState<NotificationKindCatalogRow[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reloadInbox = useCallback(async () => {
    const [list, unread] = await Promise.all([
      listMyNotifications({ audience: 'staff', limit: 100 }),
      countUnreadNotifications('staff'),
    ])
    setItems(list)
    setUnreadTotal(unread)
  }, [])

  const reloadOps = useCallback(async () => {
    const [d, c, k] = await Promise.all([
      listNotificationDeliveries({
        limit: 80,
        status: deliveryStatus || undefined,
      }),
      listNotificationChannelConfig(),
      listNotificationKindCatalog(),
    ])
    setDeliveries(d)
    setChannels(c)
    setKinds(k)
  }, [deliveryStatus])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      // Contagem da aba "Minhas notificações" precisa do inbox mesmo no Avançado.
      if (layer === 'advanced') {
        await Promise.all([reloadInbox(), reloadOps()])
      } else {
        await reloadInbox()
      }
      setError(null)
    } catch (e) {
      setError(toUserMessage(e, 'Erro ao carregar notificações'))
    } finally {
      setLoading(false)
    }
  }, [layer, reloadInbox, reloadOps])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!user?.id) return
    const sb = getSupabase()
    const channel = sb
      .channel(`app-notif-page:staff:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_notifications',
          filter: `recipient_profile_id=eq.${user.id}`,
        },
        () => {
          void reloadInbox()
        },
      )
      .subscribe()
    return () => {
      void sb.removeChannel(channel)
    }
  }, [user?.id, reloadInbox])

  async function openOne(n: AppNotification) {
    setBusy(true)
    const href = resolveNotificationNavHref({
      href: n.href,
      kind: n.kind,
      audience: n.audience,
    })
    const wasUnread = !n.readAt
    const prevUnread = unreadTotal
    const prevItems = items
    const nextUnread = wasUnread ? Math.max(0, unreadTotal - 1) : unreadTotal
    if (wasUnread) {
      const now = new Date().toISOString()
      setUnreadTotal(nextUnread)
      setItems((list) =>
        list.map((it) => (it.id === n.id ? { ...it, readAt: it.readAt ?? now } : it)),
      )
      emitNotifChanged('staff', { unread: nextUnread })
    }
    try {
      if (wasUnread) await markNotificationRead(n.id)
      emitNotifChanged('staff')
      navigate(href)
    } catch {
      if (wasUnread) {
        setUnreadTotal(prevUnread)
        setItems(prevItems)
        emitNotifChanged('staff', { unread: prevUnread })
      }
      navigate(href)
    } finally {
      setBusy(false)
    }
  }

  async function markAll() {
    setBusy(true)
    const prevUnread = unreadTotal
    const prevItems = items
    const now = new Date().toISOString()
    setUnreadTotal(0)
    setItems((list) => list.map((it) => ({ ...it, readAt: it.readAt ?? now })))
    emitNotifChanged('staff', { unread: 0 })
    try {
      await markAllNotificationsRead('staff')
      emitNotifChanged('staff')
      await reloadInbox()
    } catch (e) {
      setUnreadTotal(prevUnread)
      setItems(prevItems)
      emitNotifChanged('staff', { unread: prevUnread })
      toast.push(toUserMessage(e, 'Não foi possível marcar como lidas'), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function onReprocess(id: string) {
    setBusy(true)
    try {
      await reprocessNotificationDelivery(id)
      toast.push('Envio reprocessado', 'success')
      await reloadOps()
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao reprocessar'), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading && layer === 'inbox' && items.length === 0) {
    return <Loading label="Carregando notificações…" />
  }
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-4">
      <AdminTabs
        aria-label="Camadas de notificações"
        activeId={layer}
        items={[
          {
            id: 'inbox',
            label: 'Minhas notificações',
            count: unreadTotal > 0 ? unreadTotal : undefined,
            onSelect: () => setLayer('inbox'),
          },
          {
            id: 'advanced',
            label: 'Avançado',
            onSelect: () => setLayer('advanced'),
          },
        ]}
      />

      {layer === 'inbox' ? (
        <NotificationInbox
          eyebrow="Operação"
          title="Notificações"
          items={items}
          unreadTotal={unreadTotal}
          busy={busy}
          emptyActionLabel="Ir aos pedidos"
          emptyActionTo="/admin/pedidos"
          emptyDescription="Quando o cliente responder, pedir cancelamento ou reportar problema, o aviso aparece aqui."
          onOpen={(n) => void openOne(n)}
          onMarkAll={() => void markAll()}
          headerExtra={
            <Button type="button" variant="light" onClick={() => void reload()} disabled={busy}>
              Atualizar
            </Button>
          }
        />
      ) : null}

      {layer === 'advanced' ? (
        <div className="space-y-4">
          <div className="rounded-fal border border-fal-line bg-fal-surface p-5">
            <h2 className="mt-0 mb-1 text-xl font-extrabold text-fal-fg">Avançado</h2>
            <p className="mb-0 mt-1 text-sm text-fal-muted">
              Histórico técnico de envios e catálogo. WhatsApp e e-mail continuam desligados.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant={advancedTab === 'deliveries' ? 'primary' : 'outline'}
                onClick={() => setAdvancedTab('deliveries')}
              >
                Histórico de envios
              </Button>
              <Button
                type="button"
                variant={advancedTab === 'config' ? 'primary' : 'outline'}
                onClick={() => setAdvancedTab('config')}
              >
                Canais e tipos
              </Button>
            </div>
          </div>

          {advancedTab === 'deliveries' ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['', 'Todos'],
                    ['sent', 'Enviados'],
                    ['failed', 'Falhas'],
                    ['skipped', 'Pulados'],
                    ['read', 'Lidos'],
                  ] as const
                ).map(([st, label]) => (
                  <Button
                    key={label}
                    type="button"
                    variant={deliveryStatus === st ? 'primary' : 'outline'}
                    onClick={() => setDeliveryStatus(st)}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {deliveries.length === 0 ? (
                <EmptyState
                  title="Nenhum envio registrado"
                  description="Novos eventos de pedido geram linhas neste histórico (canal no site)."
                >
                  <div className="mt-5 flex justify-center">
                    <Button type="button" variant="primary" onClick={() => setLayer('inbox')}>
                      Voltar às notificações
                    </Button>
                  </div>
                </EmptyState>
              ) : (
                <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-fal-surface">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-fal-line bg-fal-bg/60 text-xs uppercase text-fal-muted">
                      <tr>
                        <th className="px-3 py-2 font-bold">Quando</th>
                        <th className="px-3 py-2 font-bold">Tipo</th>
                        <th className="px-3 py-2 font-bold">Canal</th>
                        <th className="px-3 py-2 font-bold">Status</th>
                        <th className="px-3 py-2 font-bold">Pedido</th>
                        <th className="px-3 py-2 font-bold">Erro</th>
                        <th className="px-3 py-2 font-bold">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveries.map((d) => (
                        <tr key={d.id} className="border-b border-fal-line last:border-0">
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-fal-muted">
                            {formatDateTime(d.createdAt)}
                          </td>
                          <td className="px-3 py-2 font-semibold text-fal-fg">{d.kind}</td>
                          <td className="px-3 py-2">
                            {CHANNEL_LABEL[d.channel] ?? d.channel}
                          </td>
                          <td className="px-3 py-2">
                            <span className="rounded bg-fal-bg px-1.5 py-0.5 text-xs font-bold">
                              {STATUS_LABEL[d.status] ?? d.status}
                            </span>
                            {d.attempts > 0 ? (
                              <span className="ml-1 text-xs text-fal-muted">×{d.attempts}</span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2">
                            {d.orderId ? (
                              <Link
                                className="font-semibold text-fal-auth-link"
                                to={`/admin/pedidos/${d.orderId}`}
                              >
                                {d.orderId.slice(0, 8)}…
                              </Link>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="max-w-[12rem] truncate px-3 py-2 text-xs text-fal-muted">
                            {d.lastError ?? '—'}
                          </td>
                          <td className="px-3 py-2">
                            {d.status === 'failed' || d.status === 'skipped' ? (
                              <Button
                                type="button"
                                variant="outline"
                                disabled={busy || d.channel !== 'in_app'}
                                onClick={() => void onReprocess(d.id)}
                              >
                                Reprocessar
                              </Button>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {advancedTab === 'config' ? (
            <div className="space-y-4">
              <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
                <h3 className="mt-0 mb-2 text-base font-extrabold text-fal-fg">Canais</h3>
                <p className="mt-0 mb-3 text-sm text-fal-muted">
                  Só o canal “No site” está ativo. WhatsApp e e-mail ficam desligados até a próxima
                  frente.
                </p>
                <ul className="m-0 list-none space-y-2 p-0">
                  {channels.map((c) => (
                    <li
                      key={c.channel}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-fal-line px-3 py-2"
                    >
                      <div>
                        <span className="font-extrabold text-fal-fg">
                          {CHANNEL_LABEL[c.channel] ?? c.channel}
                        </span>
                        {c.notes ? (
                          <p className="mb-0 mt-1 text-xs text-fal-muted">{c.notes}</p>
                        ) : null}
                      </div>
                      <span
                        className={[
                          'rounded px-2 py-0.5 text-xs font-bold',
                          c.enabled
                            ? 'bg-fal-success/15 text-fal-fg'
                            : 'bg-fal-bg text-fal-muted',
                        ].join(' ')}
                      >
                        {c.enabled ? 'Ativo' : 'Desligado'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-fal-surface">
                <div className="border-b border-fal-line px-4 py-3">
                  <h3 className="m-0 text-base font-extrabold text-fal-fg">Tipos de aviso</h3>
                  <p className="mb-0 mt-1 text-sm text-fal-muted">
                    Quem recebe cada tipo e em qual categoria ele aparece.
                  </p>
                </div>
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-fal-line bg-fal-bg/60 text-xs uppercase text-fal-muted">
                    <tr>
                      <th className="px-3 py-2 font-bold">Tipo</th>
                      <th className="px-3 py-2 font-bold">Categoria</th>
                      <th className="px-3 py-2 font-bold">Prioridade</th>
                      <th className="px-3 py-2 font-bold">Cliente</th>
                      <th className="px-3 py-2 font-bold">Operador</th>
                      <th className="px-3 py-2 font-bold">Obrigatório</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kinds.map((k) => (
                      <tr key={k.kind} className="border-b border-fal-line last:border-0">
                        <td className="px-3 py-2 font-semibold text-fal-fg">{k.kind}</td>
                        <td className="px-3 py-2">
                          {k.category
                            ? categoryLabel(k.category as AppNotificationCategory)
                            : '—'}
                        </td>
                        <td className="px-3 py-2">{k.severity}</td>
                        <td className="px-3 py-2">{k.notifyCustomer ? 'sim' : '—'}</td>
                        <td className="px-3 py-2">{k.notifyStaff ? 'sim' : '—'}</td>
                        <td className="px-3 py-2">{k.mandatory ? 'sim' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
