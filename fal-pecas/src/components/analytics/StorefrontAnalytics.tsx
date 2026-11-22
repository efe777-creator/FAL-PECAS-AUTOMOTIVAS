import { trackBeginCheckout, trackPageView } from '@/lib/analytics'
import { captureAttributionFromLocation } from '@/lib/attribution'
import { COOKIE_CONSENT_CHANGED_EVENT } from '@/lib/cookieNotice'
import { syncMarketingTags } from '@/lib/marketingTags'
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Loja: Consent Mode + sync tags (#15-A), atribuição Ads, page_view.
 * Montar só no MainLayout (não no admin).
 */
export function StorefrontAnalytics() {
  const location = useLocation()
  const checkoutTracked = useRef(false)

  useEffect(() => {
    syncMarketingTags()
    function onConsentChanged() {
      syncMarketingTags()
    }
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, onConsentChanged)
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, onConsentChanged)
  }, [])

  useEffect(() => {
    captureAttributionFromLocation({
      search: location.search,
      pathname: location.pathname,
    })
  }, [location.search, location.pathname])

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}`)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (location.pathname !== '/checkout') {
      checkoutTracked.current = false
      return
    }
    if (checkoutTracked.current) return
    checkoutTracked.current = true
    trackBeginCheckout({})
  }, [location.pathname])

  return null
}
