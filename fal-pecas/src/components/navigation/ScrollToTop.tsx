import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Rola ao topo só em troca de rota (pathname). Não reage a ?page= no catálogo. */
export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
