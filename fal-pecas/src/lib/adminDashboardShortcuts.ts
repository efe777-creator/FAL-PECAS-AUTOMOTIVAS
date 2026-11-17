import { filterAdminNavLinks } from '@/lib/adminNavAccess'

/** Catálogo de atalhos do Painel (subset útil — não espelha a sidebar inteira). */
export const ADMIN_DASHBOARD_SHORTCUT_CATALOG: ReadonlyArray<{
  to: string
  label: string
}> = [
  { to: '/admin/pedidos', label: 'Pedidos' },
  { to: '/admin/avisos', label: 'Notificações' },
  { to: '/admin/estoque', label: 'Estoque' },
  { to: '/admin/logistica', label: 'Logística' },
  { to: '/admin/pagamentos', label: 'Pagamentos' },
  { to: '/admin/relatorios', label: 'Relatórios' },
  { to: '/admin/clientes', label: 'Clientes' },
  { to: '/admin/produtos', label: 'Produtos' },
]

export const ADMIN_DASHBOARD_DEFAULT_PINS: readonly string[] = [
  '/admin/pedidos',
  '/admin/avisos',
  '/admin/estoque',
  '/admin/logistica',
  '/admin/pagamentos',
]

export function listDashboardShortcutsForRole(
  role: string | null | undefined,
): Array<{ to: string; label: string }> {
  return filterAdminNavLinks([...ADMIN_DASHBOARD_SHORTCUT_CATALOG], role)
}

export function defaultPinnedPathsForRole(
  role: string | null | undefined,
): string[] {
  const allowed = new Set(listDashboardShortcutsForRole(role).map((s) => s.to))
  return ADMIN_DASHBOARD_DEFAULT_PINS.filter((p) => allowed.has(p))
}

export function labelForShortcutPath(path: string): string {
  return (
    ADMIN_DASHBOARD_SHORTCUT_CATALOG.find((s) => s.to === path)?.label ?? path
  )
}
