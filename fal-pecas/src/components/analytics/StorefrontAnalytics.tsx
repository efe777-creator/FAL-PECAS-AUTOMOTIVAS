import { trackBeginCheckout, trackPageView } from '@/lib/analytics'
import { captureAttributionFromLocation } from '@/lib/attribution'
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Loja: captura atribuição Ads + page_view no-op (facade).
 * Montar só no MainLayout (não no admin).
 */
export function StorefrontAnalytics() {
  const location = useLocation()
  const checkoutTracked = useRef(false)

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
