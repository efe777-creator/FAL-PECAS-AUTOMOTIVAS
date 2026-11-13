import {
  countUnreadNotifications,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/services/notifications/appNotificationService'
import {
  notificationNeedsAction,
  resolveNotificationNavHref,
} from '@/lib/appNotificationCopy'
import { formatDateTime } from '@/lib/datetime'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Props = {
  /** Página lista completa */
  allHref: string
  /** Variante visual no admin (fundo escuro) */
  variant?: 'light' | 'dark'
  pollMs?: number
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 22a2.2 2.2 0 0 0 2.2-2.2h-4.4A2.2 2.2 0 0 0 12 22Zm7.2-6.2V11a7.2 7.2 0 0 0-5.4-7V3.2a1.8 1.8 0 1 0-3.6 0V4a7.2 7.2 0 0 0-5.4 7v4.8L3 17.6v1.2h18v-1.2l-1.8-1.8Z"
        fill="currentColor"
      />
    </svg>
  )
}

function sortForDropdown(items: AppNotification[]): AppNotification[] {
  return [...items].sort((a, b) => {
    const aAct =
      notificationNeedsAction({ kind: a.kind, audience: a.audience, actionable: a.actionable }) &&
      !a.readAt
        ? 0
        : 1
    const bAct =
      notificationNeedsAction({ kind: b.kind, audience: b.audience, actionable: b.actionable }) &&
      !b.readAt
        ? 0
        : 1
    if (aAct !== bAct) return aAct - bAct
    return b.createdAt.localeCompare(a.createdAt)
  })
}

export function NotificationBell({ allHref, variant = 'light', pollMs = 30_000 }: Props) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<AppNotification[]>([])
  const [busy, setBusy] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    try {
      const [n, list] = await Promise.all([
        countUnreadNotifications(),
        listMyNotifications({ limit: 10 }),
      ])
      setUnread(n)
      setItems(sortForDropdown(list))
    } catch {
      /* silencioso no header */
    }
  }, [])

  useEffect(() => {
    void refresh()
    const t = window.setInterval(() => void refresh(), pollMs)
    function onFocus() {
      void refresh()
    }
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(t)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh, pollMs])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function openItem(n: AppNotification) {
    setBusy(true)
    const href = resolveNotificationNavHref({
      href: n.href,
      kind: n.kind,
      audience: n.audience,
    })
    try {
      if (!n.readAt) await markNotificationRead(n.id)
      setOpen(false)
      await refresh()
      navigate(href)
    } catch {
      navigate(href)
    } finally {
      setBusy(false)
    }
  }

  async function onMarkAll() {
    setBusy(true)
    try {
      await markAllNotificationsRead()
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const dark = variant === 'dark'
  const btnClass = dark
    ? 'relative grid h-11 w-11 min-h-11 min-w-11 place-items-center rounded-lg text-white/90 hover:bg-white/10'
    : 'relative grid h-11 w-11 min-h-11 min-w-11 place-items-center rounded-lg border border-fal-line bg-white text-fal-navy hover:bg-fal-bg'

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={btnClass}
        aria-label={unread > 0 ? `Notificações, ${unread} não lidas` : 'Notificações'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen((v) => !v)
          if (!open) void refresh()
        }}
      >
        <BellIcon />
        {unread > 0 ? (
          <span className="absolute right-0.5 top-0.5 min-w-[1.1rem] rounded-full bg-fal-yellow px-1 text-center text-[10px] font-extrabold leading-4 text-fal-navy">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notificações"
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[12px] border border-fal-line bg-white shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-fal-line px-3 py-2">
            <p className="m-0 text-sm font-extrabold text-fal-navy">Notificações</p>
            <button
              type="button"
              className="text-xs font-bold text-fal-auth-link disabled:opacity-50"
              disabled={busy || unread === 0}
              onClick={() => void onMarkAll()}
            >
              Marcar todos lidos
            </button>
          </div>
          <ul className="m-0 max-h-80 list-none space-y-0 overflow-y-auto p-0">
            {items.length === 0 ? (
              <li className="px-3 py-4 text-sm text-fal-muted">Nenhum aviso por enquanto.</li>
            ) : (
              items.map((n) => {
                const actionable = notificationNeedsAction({
                  kind: n.kind,
                  audience: n.audience,
                  actionable: n.actionable,
                })
                return (
                  <li key={n.id} className="border-b border-fal-line last:border-0">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void openItem(n)}
                      className={[
                        'block w-full px-3 py-2.5 text-left hover:bg-fal-bg/80',
                        actionable && !n.readAt
                          ? 'bg-sky-50'
                          : n.readAt
                            ? 'opacity-80'
                            : 'bg-fal-yellow/10',
                      ].join(' ')}
                    >
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold text-fal-navy">{n.title}</span>
                        {actionable ? (
                          <span className="rounded bg-sky-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            Ação necessária
                          </span>
                        ) : null}
                      </span>
                      {n.body ? (
                        <span className="mt-0.5 block text-xs text-fal-muted line-clamp-2">
                          {n.body}
                        </span>
                      ) : null}
                      <span className="mt-1 block text-[11px] text-fal-muted">
                        {formatDateTime(n.createdAt)}
                        {!n.readAt ? ' · Não lido' : ''}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
          <div className="border-t border-fal-line px-3 py-2">
            <Link
              to={allHref}
              className="text-sm font-bold text-fal-auth-link no-underline"
              onClick={() => setOpen(false)}
            >
              Ver todos →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
