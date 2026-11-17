import {
  adminBackFallback,
  adminLocationKey,
  popAdminNavPrevious,
  pushAdminNavLocation,
} from '@/lib/adminNavStack'
import type { AdminCrumb } from '@/lib/adminBreadcrumbs'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

type Props = {
  crumbs: AdminCrumb[]
  /** Oculta o botão (ex.: raiz /admin). */
  hidden?: boolean
}

/**
 * Voltar global do admin: stack sessionStorage + fallback breadcrumb.
 * Não substitui “Voltar à fila” de pedidos.
 */
export function AdminBackButton({ crumbs, hidden }: Props) {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    pushAdminNavLocation(location.pathname, location.search)
  }, [location.pathname, location.search])

  if (hidden) return null

  function onBack() {
    const current = adminLocationKey(location.pathname, location.search)
    const prev = popAdminNavPrevious(current)
    if (prev) {
      navigate(prev)
      return
    }
    navigate(adminBackFallback(crumbs))
  }

  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-fal-line bg-fal-bg px-2.5 text-sm font-semibold text-fal-fg hover:border-fal-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-accent"
      aria-label="Voltar à tela anterior"
    >
      <span aria-hidden>←</span>
      <span className="hidden sm:inline">Voltar</span>
    </button>
  )
}
