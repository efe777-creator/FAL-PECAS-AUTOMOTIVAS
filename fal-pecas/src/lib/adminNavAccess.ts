import type { UserRole } from '@/types'

/** Papéis com acesso ao painel (exceto customer). */
const STAFF: UserRole[] = [
  'administrador',
  'gerente',
  'operador',
  'estoque',
  'atendimento',
]

const MGMT: UserRole[] = ['administrador', 'gerente']
const CATALOG_OPS: UserRole[] = ['administrador', 'gerente', 'operador']
const STOCK: UserRole[] = ['administrador', 'gerente', 'operador', 'estoque']
const SALES: UserRole[] = ['administrador', 'gerente', 'operador', 'atendimento']

/**
 * Quem vê cada rota do menu admin.
 * RLS continua sendo a fonte de verdade; isto só esconde links inúteis.
 */
const PATH_ROLES: Record<string, UserRole[]> = {
  '/admin': STAFF,
  '/admin/produtos': STOCK,
  '/admin/aplicacoes': CATALOG_OPS,
  '/admin/precos': MGMT,
  '/admin/importacoes': MGMT,
  '/admin/categorias': CATALOG_OPS,
  '/admin/home': MGMT,
  '/admin/busca': MGMT,
  '/admin/montadoras': CATALOG_OPS,
  '/admin/veiculos': CATALOG_OPS,
  '/admin/fabricantes': CATALOG_OPS,
  '/admin/fornecedores': MGMT,
  '/admin/pedidos': STAFF,
  '/admin/clientes': SALES,
  '/admin/estoque': STOCK,
  '/admin/logistica': CATALOG_OPS,
  '/admin/relatorios': MGMT,
  '/admin/operadores': ['administrador'],
}

export function canAccessAdminPath(
  pathname: string,
  role: string | null | undefined,
): boolean {
  if (!role || role === 'customer') return false
  const r = role as UserRole
  if (!STAFF.includes(r)) return false

  const exact = PATH_ROLES[pathname]
  if (exact) return exact.includes(r)

  // Prefixo: /admin/pedidos/xyz → pedidos; /admin/produtos/novo → produtos
  const keys = Object.keys(PATH_ROLES).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (key === '/admin') continue
    if (pathname === key || pathname.startsWith(`${key}/`)) {
      return PATH_ROLES[key]!.includes(r)
    }
  }
  return r === 'administrador' || r === 'gerente'
}

export function filterAdminNavLinks<T extends { to: string }>(
  links: T[],
  role: string | null | undefined,
): T[] {
  return links.filter((l) => canAccessAdminPath(l.to, role))
}
