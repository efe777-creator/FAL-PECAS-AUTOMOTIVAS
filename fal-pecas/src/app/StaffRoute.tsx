import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { isStaffRole } from '@/services/admin/staffService'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'

/** Tempo máximo em “Verificando permissões…” (IMP-19 U2 / FIND-013). */
const STAFF_GATE_TIMEOUT_MS = 12_000

export function StaffRoute({ children }: { children: ReactNode }) {
  const { user, loading, profileLoading } = useAuth()
  const location = useLocation()
  const [timedOut, setTimedOut] = useState(false)

  const gating = loading || profileLoading

  useEffect(() => {
    if (!gating) {
      setTimedOut(false)
      return
    }
    const t = window.setTimeout(() => setTimedOut(true), STAFF_GATE_TIMEOUT_MS)
    return () => window.clearTimeout(t)
  }, [gating])

  if (gating && timedOut) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="m-0 text-xl font-extrabold text-fal-navy">Não foi possível verificar a sessão</h1>
        <p className="m-0 text-sm text-fal-muted">
          A verificação de permissões demorou demais. Tente entrar novamente ou volte à loja.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link to="/login" state={{ from: location.pathname }}>
            <Button variant="primary">Ir para login</Button>
          </Link>
          <Link to="/">
            <Button variant="light">Ir para início</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (gating) return <Loading label="Verificando permissões…" />
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (!isStaffRole(user.role)) {
    return <Navigate to="/" replace />
  }
  return children
}
