import { NotificationInboxItem } from '@/components/notifications/NotificationInboxItem'
import { useAuth } from '@/contexts/AuthContext'
import { resolveNotificationNavHref } from '@/lib/appNotificationCopy'
import { sortNotificationsForInbox } from '@/lib/notificationDisplay'
import { getSupabase } from '@/lib/supabase'
import {
  countUnreadNotifications,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type AppNotificationAudience,
} from '@/services/notifications/appNotificationService'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'

type Props = {
  allHref: string
  audience: AppNotificationAudience
  variant?: 'light' | 'dark'
  pollMs?: number
}

type PanelPos = {
  top: number
  left: number
  width: number
  maxHeight: number
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

function computePanelPos(anchor: DOMRect): PanelPos {
  const margin = 12
  const gap = 8
  const vw = window.innerWidth
  const vh = window.innerHeight
  const narrow = vw < 640

  // Mobile: quase full-bleed. Desktop: até 22rem, alinhado ao sino.
  const width = narrow
    ? Math.max(240, vw - margin * 2)
    : Math.min(22 * 16, Math.max(280, vw - margin * 2))

  let left = narrow ? margin : anchor.right - width
  if (left < margin) left = margin
  if (left + width > vw - margin) left = Math.max(margin, vw - margin - width)

  const top = Math.min(anchor.bottom + gap, vh - margin - 120)
  const maxHeight = Math.max(180, Math.min(vh * 0.7, vh - top - margin))

  return { top, left, width, maxHeight }
}

export function NotificationBell({
  allHref,
  audience,
  variant = 'light',
  pollMs = 45_000,
}: Props) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<AppNotification[]>([])
  const [busy, setBusy] = useState(false)
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const realtimeChannelSuffix = useId().replace(/:/g, '')

  const refresh = useCallback(async () => {
    try {
      const [n, list] = await Promise.all([
        countUnreadNotifications(audience),
        listMyNotifications({ audience, limit: 10 }),
      ])
      setUnread(n)
      setItems(sortNotificationsForInbox(list).slice(0, 10))
    } catch {
      /* silencioso no header */
    }
  }, [audience])

  const refreshRef = useRef(refresh)
  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  const updatePanelPos = useCallback(() => {
    const el = btnRef.current
    if (!el) return
    setPanelPos(computePanelPos(el.getBoundingClientRect()))
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
    if (!user?.id) return
    const sb = getSupabase()
    const channel = sb
      .channel(`app-notif:${audience}:${user.id}:${realtimeChannelSuffix}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_notifications',
          filter: `recipient_profile_id=eq.${user.id}`,
        },
        () => {
          void refreshRef.current()
        },
      )
      .subscribe()
    return () => {
      void sb.removeChannel(channel)
    }
  }, [user?.id, audience, realtimeChannelSuffix])

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null)
      return
    }
    updatePanelPos()
    function onWin() {
      updatePanelPos()
    }
    window.addEventListener('resize', onWin)
    window.addEventListener('scroll', onWin, true)
    return () => {
      window.removeEventListener('resize', onWin)
      window.removeEventListener('scroll', onWin, true)
    }
  }, [open, updatePanelPos])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (rootRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      setOpen(false)
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
      await markAllNotificationsRead(audience)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const dark = variant === 'dark'
  const btnClass = dark
    ? 'relative grid h-11 w-11 min-h-11 min-w-11 place-items-center rounded-lg text-white/90 hover:bg-white/10'
    : 'relative grid h-11 w-11 min-h-11 min-w-11 place-items-center rounded-lg border border-fal-line bg-white text-fal-navy hover:bg-fal-bg'

  const panel =
    open && panelPos
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Central de notificações"
            className="fixed z-[300] box-border overflow-x-hidden overflow-y-hidden rounded-[12px] border border-fal-line bg-white shadow-xl"
            style={{
              top: panelPos.top,
              left: panelPos.left,
              width: panelPos.width,
              maxWidth: 'calc(100vw - 24px)',
              maxHeight: panelPos.maxHeight,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div className="flex shrink-0 flex-col gap-2 border-b border-fal-line px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="m-0 text-sm font-extrabold text-fal-navy">Notificações</p>
                <p className="m-0 text-[11px] text-fal-muted">
                  {unread > 0 ? `${unread} não lida${unread === 1 ? '' : 's'}` : 'Tudo lido'}
                </p>
              </div>
              <button
                type="button"
                className="max-w-full self-start break-words text-left text-xs font-bold text-fal-auth-link disabled:opacity-50"
                disabled={busy || unread === 0}
                onClick={() => void onMarkAll()}
              >
                Marcar todas como lidas
              </button>
            </div>
            <ul className="m-0 min-h-0 min-w-0 flex-1 list-none space-y-0 overflow-x-hidden overflow-y-auto overscroll-contain p-0">
              {items.length === 0 ? (
                <li className="px-3 py-4 text-sm text-fal-muted">Nenhum aviso por enquanto.</li>
              ) : (
                items.map((n) => (
                  <li key={n.id} className="border-b border-fal-line last:border-0">
                    <NotificationInboxItem
                      notification={n}
                      busy={busy}
                      compact
                      onOpen={(item) => void openItem(item)}
                    />
                  </li>
                ))
              )}
            </ul>
            <div className="shrink-0 border-t border-fal-line px-3 py-2.5">
              <Link
                to={allHref}
                className="text-sm font-bold text-fal-auth-link no-underline"
                onClick={() => setOpen(false)}
              >
                Ver todos →
              </Link>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className={btnClass}
        aria-label={unread > 0 ? `Notificações, ${unread} não lidas` : 'Notificações'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          // Fecha drawer/sidebar mobile se estiver aberto (evita overlap/corte).
          window.dispatchEvent(new CustomEvent('fal:close-mobile-nav'))
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
      {panel}
    </div>
  )
}
