import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'

interface ToastAction {
  label: string
  /** Navegação (Link). Mutuamente exclusivo com onClick na prática. */
  to?: string
  /** Ação imediata (ex.: Desfazer remoção no carrinho). */
  onClick?: () => void
}

interface ToastItem {
  id: number
  message: string
  tone: 'info' | 'success' | 'error'
  action?: ToastAction
}

type ToastPushOptions = {
  action?: ToastAction
  durationMs?: number
}

interface ToastContextValue {
  push: (
    message: string,
    tone?: ToastItem['tone'],
    options?: ToastPushOptions,
  ) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback(
    (message: string, tone: ToastItem['tone'] = 'info', options?: ToastPushOptions) => {
      const id = Date.now() + Math.random()
      const duration = options?.durationMs ?? (options?.action ? 6000 : 3200)
      setItems((prev) => [
        ...prev,
        { id, message, tone, action: options?.action },
      ])
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    },
    [],
  )

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* left + bottom alto: evita badge "Powered by Netlify" e deixa o CTA clicável */}
      <div className="pointer-events-none fixed bottom-24 left-4 z-[300] flex w-[min(380px,calc(100%-2rem))] flex-col gap-2 sm:bottom-6">
        {items.map((t) => (
          <div
            key={t.id}
            className={[
              'pointer-events-auto flex items-center justify-between gap-3 rounded-[10px] px-4 py-3 text-sm font-semibold shadow-fal',
              t.tone === 'success' && 'bg-fal-success text-white',
              t.tone === 'error' && 'bg-fal-danger text-white',
              t.tone === 'info' && 'bg-fal-navy text-white',
            ]
              .filter(Boolean)
              .join(' ')}
            role={t.tone === 'error' ? 'alert' : 'status'}
          >
            <span className="min-w-0 flex-1 leading-snug">{t.message}</span>
            {t.action?.onClick ? (
              <button
                type="button"
                className="shrink-0 rounded-md bg-white/20 px-2.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white hover:bg-white/30"
                onClick={() => {
                  t.action?.onClick?.()
                  setItems((prev) => prev.filter((x) => x.id !== t.id))
                }}
              >
                {t.action.label}
              </button>
            ) : t.action?.to ? (
              <Link
                to={t.action.to}
                className="shrink-0 rounded-md bg-white/20 px-2.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white no-underline hover:bg-white/30"
              >
                {t.action.label}
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return ctx
}
