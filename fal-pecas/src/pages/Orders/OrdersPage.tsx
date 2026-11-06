import { Navigate } from 'react-router-dom'

/** Legado: pedidos do cliente ficam em /conta/pedidos. */
export function OrdersPage() {
  return <Navigate to="/conta/pedidos" replace />
}
