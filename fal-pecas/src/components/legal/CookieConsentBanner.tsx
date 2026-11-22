import {
  COOKIE_PREFERENCES_EVENT,
  hasAcceptedCookieNotice,
  saveCookieConsent,
} from '@/lib/cookieNotice'
import { syncMarketingTags } from '@/lib/marketingTags'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    return !hasAcceptedCookieNotice()
  })

  useEffect(() => {
    function onOpenPreferences() {
      setVisible(true)
    }
    window.addEventListener(COOKIE_PREFERENCES_EVENT, onOpenPreferences)
    return () => window.removeEventListener(COOKIE_PREFERENCES_EVENT, onOpenPreferences)
  }, [])

  if (!visible) return null

  function choose(marketing: boolean) {
    saveCookieConsent({ marketing })
    syncMarketingTags()
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies e armazenamento local"
      className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-[90] border-t border-fal-line bg-fal-navy px-3 py-3 text-[#e8ecf0] shadow-[0_-8px_24px_rgba(0,0,0,0.18)] lg:bottom-0"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="m-0 text-sm leading-snug">
          Usamos cookies e armazenamento local essenciais para sessão, carrinho e segurança da
          loja. Com seu consentimento, também poderemos usar cookies de analytics/marketing (Google
          Ads, Meta) quando estiverem configurados — você pode escolher só o essencial.{' '}
          <Link
            to="/cookies"
            className="font-semibold text-fal-yellow underline-offset-2 hover:underline"
          >
            Saber mais
          </Link>
        </p>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => choose(false)}
            className="rounded-[10px] border border-[#5a6570] bg-transparent px-4 py-2.5 text-sm font-bold text-[#e8ecf0] hover:bg-fal-surface/5"
          >
            Só essenciais
          </button>
          <button
            type="button"
            onClick={() => choose(true)}
            className="rounded-[10px] bg-fal-yellow px-4 py-2.5 text-sm font-extrabold text-fal-navy dark:text-fal-fg hover:brightness-95"
          >
            Aceitar analytics
          </button>
        </div>
      </div>
    </div>
  )
}
