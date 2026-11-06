import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Rola ao topo em navegação PUSH/REPLACE (pathname).
 * Em POP (voltar/avançar) não mexe — permite restaurar posição (ex.: catálogo → PDP → voltar).
 * Não reage a ?page= no catálogo.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()
  const navType = useNavigationType()

  useEffect(() => {
    if (navType === 'POP') return
    window.scrollTo(0, 0)
  }, [pathname, navType])

  return null
}
