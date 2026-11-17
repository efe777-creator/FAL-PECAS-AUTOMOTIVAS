import { legacyAreaPathToHub } from '@/lib/adminOrdersUrl'
import { Navigate, useLocation } from 'react-router-dom'

/** Onda 1: áreas legadas → hub com ?tab=&area=&fila= */
export function RedirectLegacyOrdersArea() {
  const loc = useLocation()
  const to = legacyAreaPathToHub(loc.pathname, loc.search) ?? '/admin/pedidos'
  return <Navigate to={to} replace />
}
