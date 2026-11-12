import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDateTime } from '@/lib/datetime'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  countUnreadNotifications,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/services/notifications/appNotificationService'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function AccountNotificationsPage() {
  useDocumentTitle('Notificações | FAL Peças Automotivas')
  const navigate = useNavigate()
  const [items, setItems] = useState<AppNotification[]>([])
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [list, unread] = await Promise.all([
        listMyNotifications({ limit: 100, unreadOnly }),
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
  }, [unreadOnly])

  useEffect(() => {
    void reload()
  }, [reload])

  async function openOne(n: AppNotification) {
    setBusy(true)
    try {
      if (!n.readAt) await markNotificationRead(n.id)
      navigate(n.href)
    } catch {
      navigate(n.href)
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
              variant={unreadOnly ? 'primary' : 'outline'}
              onClick={() => setUnreadOnly((v) => !v)}
            >
              {unreadOnly ? 'Mostrando não lidas' : 'Só não lidas'}
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

      {items.length === 0 ? (
        <EmptyState
          title={unreadOnly ? 'Nenhuma notificação não lida' : 'Nenhuma notificação ainda'}
          description="Quando o status do pedido mudar ou a retirada for liberada, a notificação aparece aqui."
          actionLabel="Meus pedidos"
          actionTo="/conta/pedidos"
        />
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void openOne(n)}
                className={[
                  'w-full rounded-fal border px-4 py-3 text-left transition hover:border-fal-navy/40',
                  n.readAt
                    ? 'border-fal-line bg-white'
                    : 'border-fal-yellow-dark/40 bg-fal-yellow/15',
                ].join(' ')}
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-extrabold text-fal-navy">{n.title}</span>
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
                    to={n.href}
                    className="font-semibold text-fal-auth-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Abrir pedido
                  </Link>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
