import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Rola ao topo só quando o pathname muda em PUSH/REPLACE.
 * Não reage a troca só de search (ex.: ?page= no “Carregar mais”) nem a POP
 * (voltar/avançar — catálogo restaura a posição sozinho).
 */
export function ScrollToTop() {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  const prevPathname = useRef(pathname)

  useEffect(() => {
    const pathChanged = prevPathname.current !== pathname
    prevPathname.current = pathname
    if (!pathChanged) return
    if (navType === 'POP') return
    window.scrollTo(0, 0)
  }, [pathname, navType])

  return null
}
