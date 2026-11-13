import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
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
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Filter = 'all' | 'unread' | 'action'

export function AccountNotificationsPage() {
  useDocumentTitle('Notificações | FAL Peças Automotivas')
  const navigate = useNavigate()
  const [items, setItems] = useState<AppNotification[]>([])
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [list, unread] = await Promise.all([
        listMyNotifications({ limit: 100 }),
        countUnreadNotifications(),
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
      await reload()
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loading label="Carregando notificações…" />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-4">
      <div className="rounded-fal border border-fal-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
              Minha conta
            </p>
            <h2 className="mt-1 mb-0 text-xl font-extrabold text-fal-navy">Notificações</h2>
            <p className="mb-0 mt-2 text-sm text-fal-muted">
              Status do pedido, retirada liberada e pedidos de autorização da loja.
              {unreadTotal > 0 ? (
                <>
                  {' '}
                  <strong className="text-fal-navy">{unreadTotal} não lida(s)</strong>.
                </>
              ) : null}
            </p>
          </div>
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
        </div>
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
          description="Quando o status do pedido mudar ou a loja pedir sua decisão, a notificação aparece aqui."
          actionLabel="Meus pedidos"
          actionTo="/conta/pedidos"
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
                    'w-full rounded-fal border px-4 py-3 text-left transition hover:border-fal-navy/40',
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
                  {n.body ? <span className="mt-1 block text-sm text-fal-muted">{n.body}</span> : null}
                  <span className="mt-2 block text-xs text-fal-muted">
                    {formatDateTime(n.createdAt)}
                    {' · '}
                    <Link
                      to={resolveNotificationNavHref({
                        href: n.href,
                        kind: n.kind,
                        audience: n.audience,
                      })}
                      className="font-semibold text-fal-auth-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actionable ? 'Ver opções e responder' : 'Abrir pedido'}
                    </Link>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
