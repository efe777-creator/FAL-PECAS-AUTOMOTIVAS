import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  notificationNeedsAction,
  resolveNotificationNavHref,
} from '@/lib/appNotificationCopy'
import { formatDateTime } from '@/lib/datetime'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  countUnreadNotifications,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
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
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type InboxFilter = 'all' | 'unread' | 'action'
type Tab = 'inbox' | 'deliveries' | 'config'

export function AdminNotificationsPage() {
  useDocumentTitle('Notificações | Admin FAL')
  const navigate = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('inbox')

  const [items, setItems] = useState<AppNotification[]>([])
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [filter, setFilter] = useState<InboxFilter>('all')
  const [busy, setBusy] = useState(false)

  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>([])
  const [deliveryStatus, setDeliveryStatus] = useState<string>('')
  const [channels, setChannels] = useState<NotificationChannelConfig[]>([])
  const [kinds, setKinds] = useState<NotificationKindCatalogRow[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reloadInbox = useCallback(async () => {
    const [list, unread] = await Promise.all([
      listMyNotifications({ limit: 100 }),
      countUnreadNotifications(),
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
      await Promise.all([reloadInbox(), reloadOps()])
      setError(null)
    } catch (e) {
      setError(toUserMessage(e, 'Erro ao carregar notificações'))
    } finally {
      setLoading(false)
    }
  }, [reloadInbox, reloadOps])

  useEffect(() => {
    void reload()
  }, [reload])

  const visible = useMemo(() => {
    if (filter === 'unread') return items.filter((n) => !n.readAt)
    if (filter === 'action') {
      return items.filter((n) =>
        notificationNeedsAction({ kind: n.kind, audience: n.audience, actionable: n.actionable }),
      )
    }
    return items
  }, [items, filter])

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
      await markAllNotificationsRead()
      await reloadInbox()
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

  if (loading) return <Loading label="Carregando notificações…" />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-4">
      <div className="rounded-[14px] border border-fal-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
              Central operacional
            </p>
            <h1 className="mt-1 mb-0 text-2xl font-extrabold text-fal-navy">Notificações</h1>
            <p className="mb-0 mt-2 text-sm text-fal-muted">
              Inbox do operador, histórico de envios e canais (WhatsApp futuro = off).
              {unreadTotal > 0 ? (
                <>
                  {' '}
                  <strong className="text-fal-navy">{unreadTotal} não lida(s)</strong>.
                </>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/admin/pedidos')}>
              Ir aos pedidos
            </Button>
            <Button type="button" variant="light" onClick={() => void reload()} disabled={busy}>
              Atualizar
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ['inbox', 'Minha caixa'],
              ['deliveries', 'Histórico de envios'],
              ['config', 'Canais e catálogo'],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              variant={tab === id ? 'primary' : 'outline'}
              onClick={() => setTab(id)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {tab === 'inbox' ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={filter === 'all' ? 'primary' : 'outline'}
              onClick={() => setFilter('all')}
            >
              Todas
            </Button>
            <Button
              type="button"
              variant={filter === 'unread' ? 'primary' : 'outline'}
              onClick={() => setFilter('unread')}
            >
              Não lidas
            </Button>
            <Button
              type="button"
              variant={filter === 'action' ? 'primary' : 'outline'}
              onClick={() => setFilter('action')}
            >
              Ação necessária
            </Button>
            <Button
              type="button"
              variant="light"
              disabled={busy || unreadTotal === 0}
              onClick={() => void markAll()}
            >
              Marcar todas lidas
            </Button>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              title={
                filter === 'unread'
                  ? 'Nenhuma notificação não lida'
                  : filter === 'action'
                    ? 'Nenhuma ação pendente'
                    : 'Nenhuma notificação ainda'
              }
              description="Quando o cliente responder, pedir cancelamento ou reportar problema, a notificação aparece aqui."
              actionLabel="Central de pedidos"
              actionTo="/admin/pedidos"
            />
          ) : (
            <ul className="m-0 list-none space-y-2 p-0">
              {visible.map((n) => {
                const actionable = notificationNeedsAction({
                  kind: n.kind,
                  audience: n.audience,
                  actionable: n.actionable,
                })
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void openOne(n)}
                      className={[
                        'w-full rounded-[14px] border px-4 py-3 text-left transition hover:border-fal-navy/40',
                        actionable && !n.readAt
                          ? 'border-sky-400 bg-sky-50'
                          : n.readAt
                            ? 'border-fal-line bg-white'
                            : 'border-fal-yellow-dark/40 bg-fal-yellow/15',
                      ].join(' ')}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-fal-navy">{n.title}</span>
                        {actionable ? (
                          <span className="rounded-md bg-sky-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            Ação necessária
                          </span>
                        ) : null}
                        {!n.readAt ? (
                          <span className="rounded-md bg-fal-navy px-1.5 py-0.5 text-[10px] font-bold text-white">
                            Nova
                          </span>
                        ) : null}
                      </span>
                      {n.body ? (
                        <span className="mt-1 block text-sm text-fal-muted">{n.body}</span>
                      ) : null}
                      <span className="mt-2 block text-xs text-fal-muted">
                        {formatDateTime(n.createdAt)}
                        {' · '}
                        <Link
                          to={resolveNotificationNavHref({
                            href: n.href,
                            kind: n.kind,
                            audience: n.audience,
                          })}
                          className="font-semibold text-fal-navy underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Abrir pedido
                        </Link>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      ) : null}

      {tab === 'deliveries' ? (
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
              description="Novos order_events geram linhas em notification_deliveries (canal in_app)."
            >
              <div className="mt-5 flex justify-center">
                <Button type="button" variant="primary" onClick={() => setTab('inbox')}>
                  Minha caixa
                </Button>
              </div>
            </EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-fal-line bg-fal-bg/60 text-xs uppercase text-fal-muted">
                  <tr>
                    <th className="px-3 py-2 font-bold">Quando</th>
                    <th className="px-3 py-2 font-bold">Kind</th>
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
                      <td className="px-3 py-2 font-semibold text-fal-navy">{d.kind}</td>
                      <td className="px-3 py-2">{d.channel}</td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-fal-bg px-1.5 py-0.5 text-xs font-bold">
                          {d.status}
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

      {tab === 'config' ? (
        <div className="space-y-4">
          <div className="rounded-[14px] border border-fal-line bg-white p-4">
            <h2 className="mt-0 mb-2 text-base font-extrabold text-fal-navy">Canais</h2>
            <p className="mt-0 mb-3 text-sm text-fal-muted">
              WhatsApp e e-mail ficam desligados até MARCHA N3/N4. Não dá para ligar por esta tela
              (obrigatoriedade / gate de provedor).
            </p>
            <ul className="m-0 list-none space-y-2 p-0">
              {channels.map((c) => (
                <li
                  key={c.channel}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-fal-line px-3 py-2"
                >
                  <div>
                    <span className="font-extrabold text-fal-navy">{c.channel}</span>
                    {c.provider ? (
                      <span className="ml-2 text-xs text-fal-muted">{c.provider}</span>
                    ) : null}
                    {c.notes ? (
                      <p className="mb-0 mt-1 text-xs text-fal-muted">{c.notes}</p>
                    ) : null}
                  </div>
                  <span
                    className={[
                      'rounded px-2 py-0.5 text-xs font-bold',
                      c.enabled ? 'bg-emerald-100 text-emerald-900' : 'bg-fal-bg text-fal-muted',
                    ].join(' ')}
                  >
                    {c.enabled ? 'Ativo' : 'Off'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
            <div className="border-b border-fal-line px-4 py-3">
              <h2 className="m-0 text-base font-extrabold text-fal-navy">Catálogo de eventos</h2>
              <p className="mb-0 mt-1 text-sm text-fal-muted">
                Leitura do motor N2. Kinds mandatory não podem ser desligados indiscriminadamente
                (UI de edição = evolução).
              </p>
            </div>
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-fal-line bg-fal-bg/60 text-xs uppercase text-fal-muted">
                <tr>
                  <th className="px-3 py-2 font-bold">Kind</th>
                  <th className="px-3 py-2 font-bold">Severity</th>
                  <th className="px-3 py-2 font-bold">Cliente</th>
                  <th className="px-3 py-2 font-bold">Staff</th>
                  <th className="px-3 py-2 font-bold">Mandatory</th>
                  <th className="px-3 py-2 font-bold">Canais</th>
                </tr>
              </thead>
              <tbody>
                {kinds.map((k) => (
                  <tr key={k.kind} className="border-b border-fal-line last:border-0">
                    <td className="px-3 py-2 font-semibold text-fal-navy">{k.kind}</td>
                    <td className="px-3 py-2">{k.severity}</td>
                    <td className="px-3 py-2">{k.notifyCustomer ? 'sim' : '—'}</td>
                    <td className="px-3 py-2">{k.notifyStaff ? 'sim' : '—'}</td>
                    <td className="px-3 py-2">{k.mandatory ? 'sim' : '—'}</td>
                    <td className="px-3 py-2 text-xs">{k.channels.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
