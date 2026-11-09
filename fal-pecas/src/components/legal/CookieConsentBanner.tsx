import { acceptCookieNotice, hasAcceptedCookieNotice } from '@/lib/cookieNotice'
import { useState } from 'react'
import { Link } from 'react-router-dom'

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    return !hasAcceptedCookieNotice()
  })

  if (!visible) return null

  function dismiss() {
    acceptCookieNotice()
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies e armazenamento local"
      className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-[90] border-t border-fal-line bg-fal-navy px-3 py-3 text-[#e8ecf0] shadow-[0_-8px_24px_rgba(0,0,0,0.18)] lg:bottom-0"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-sm leading-snug">
          Usamos cookies e armazenamento local essenciais para sessão, carrinho e segurança da
          loja. Não usamos cookies de marketing neste site.{' '}
          <Link to="/privacidade" className="font-semibold text-fal-yellow underline-offset-2 hover:underline">
            Saber mais
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-[10px] bg-fal-yellow px-4 py-2.5 text-sm font-extrabold text-fal-navy hover:brightness-95"
        >
          Aceitar
        </button>
      </div>
    </div>
  )
}
