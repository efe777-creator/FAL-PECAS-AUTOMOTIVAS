/** Config canônica do menu admin (IA ops-first). Acesso por papel: adminNavAccess. */

export type AdminNavLink = {
  to: string
  label: string
  end?: boolean
}

export type AdminNavSection = {
  id: string
  title: string
  links: readonly AdminNavLink[]
}

/** Item solto no topo. */
export const ADMIN_NAV_HOME: AdminNavLink = {
  to: '/admin',
  label: 'Painel',
  end: true,
}

/**
 * Seções na ordem de uso do operador/gerente.
 * Seção vazia após filterAdminNavLinks deve ser omitida na UI.
 */
export const ADMIN_NAV_SECTIONS: readonly AdminNavSection[] = [
  {
    id: 'dia-a-dia',
    title: 'Dia a dia',
    links: [
      { to: '/admin/pedidos', label: 'Central de pedidos' },
      { to: '/admin/avisos', label: 'Notificações' },
      { to: '/admin/estoque', label: 'Estoque' },
      { to: '/admin/logistica', label: 'Logística' },
    ],
  },
  {
    id: 'loja',
    title: 'Loja',
    links: [
      { to: '/admin/home', label: 'Home da loja', end: true },
      { to: '/admin/home/promocoes', label: 'Promoções', end: true },
      { to: '/admin/busca', label: 'Busca' },
    ],
  },
  {
    id: 'comercial',
    title: 'Comercial',
    links: [
      { to: '/admin/clientes', label: 'Clientes' },
      { to: '/admin/pagamentos', label: 'Pagamentos' },
      { to: '/admin/relatorios', label: 'Relatórios' },
    ],
  },
  {
    id: 'catalogo',
    title: 'Catálogo',
    links: [
      { to: '/admin/produtos', label: 'Produtos' },
      { to: '/admin/kits', label: 'Kits' },
      { to: '/admin/categorias', label: 'Categorias' },
      { to: '/admin/precos', label: 'Listas de preço' },
      { to: '/admin/aplicacoes', label: 'Aplicações' },
      { to: '/admin/importacoes', label: 'Importações' },
    ],
  },
  {
    id: 'veiculos',
    title: 'Veículos',
    links: [
      { to: '/admin/montadoras', label: 'Montadoras' },
      { to: '/admin/veiculos', label: 'Veículos' },
      { to: '/admin/modelos-3d', label: 'Modelos 3D' },
      { to: '/admin/imagens-stock', label: 'Imagens stock 2D' },
      { to: '/admin/fabricantes', label: 'Fabricantes' },
      { to: '/admin/fornecedores', label: 'Fornecedores' },
    ],
  },
  {
    id: 'sistema',
    title: 'Sistema',
    links: [{ to: '/admin/operadores', label: 'Operadores' }],
  },
] as const

/** Ordem plana de `to` (regressão de IA). */
export function adminNavLinkOrder(): string[] {
  return [
    ADMIN_NAV_HOME.to,
    ...ADMIN_NAV_SECTIONS.flatMap((s) => s.links.map((l) => l.to)),
  ]
}
