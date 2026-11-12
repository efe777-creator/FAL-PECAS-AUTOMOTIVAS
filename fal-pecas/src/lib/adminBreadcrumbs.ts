export type AdminCrumb = { to?: string; label: string }

/** Rótulos de hubs e segmentos estáveis do admin. */
const SEGMENT_LABELS: Record<string, string> = {
  produtos: 'Produtos',
  aplicacoes: 'Aplicações',
  precos: 'Preços',
  importacoes: 'Importações',
  categorias: 'Categorias',
  home: 'Home da loja',
  promocoes: 'Promoções',
  busca: 'Busca',
  montadoras: 'Montadoras',
  veiculos: 'Veículos',
  fabricantes: 'Fabricantes',
  fornecedores: 'Fornecedores',
  pedidos: 'Pedidos',
  avisos: 'Notificações',
  clientes: 'Clientes',
  estoque: 'Estoque',
  logistica: 'Logística',
  pagamentos: 'Pagamentos',
  provedores: 'Provedores',
  metodos: 'Métodos',
  'mercado-pago': 'Mercado Pago',
  webhooks: 'Webhooks',
  relatorios: 'Relatórios',
  operadores: 'Operadores',
  novo: 'Novo',
  importar: 'Importar',
  'importar-aplicacoes': 'Importar aplicações',
  'importar-hf': 'Importar arquivo completo',
  'importar-imagens': 'Importar imagens',
  'importar-conversoes': 'Importar conversões',
  'importar-custos': 'Importar custos',
  lista: 'Lista',
  'aguardando-pagamento': 'Aguardando pagamento',
  analise: 'Análise',
  separacao: 'Separação',
  expedicao: 'Expedição',
  visao: 'Visão',
  origem: 'Origem',
  'frete-proprio': 'Frete próprio',
  'melhor-envio': 'Melhor Envio',
  caixas: 'Caixas',
  configuracoes: 'Configurações',
  frete: 'Frete',
}

function looksLikeId(seg: string): boolean {
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)
  ) {
    return true
  }
  if (/^[0-9a-f]{8,}$/i.test(seg) && seg.length >= 8) return true
  if (/^\d+$/.test(seg)) return true
  return false
}

function labelForSegment(seg: string): string {
  const known = SEGMENT_LABELS[seg]
  if (known) return known
  if (looksLikeId(seg)) return 'Detalhe'
  return seg
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Trilha Painel → hub → … a partir do pathname.
 * Dashboard (`/admin`) devolve lista vazia (sem migalha).
 */
export function buildAdminBreadcrumbs(pathname: string): AdminCrumb[] {
  const clean = pathname.split('?')[0]!.replace(/\/+$/, '') || '/'
  if (clean === '/admin') return []

  if (!clean.startsWith('/admin')) return []

  const parts = clean.slice('/admin'.length).split('/').filter(Boolean)
  if (!parts.length) return []

  const crumbs: AdminCrumb[] = [{ to: '/admin', label: 'Painel' }]
  let acc = '/admin'
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i]!
    acc += `/${seg}`
    const isLast = i === parts.length - 1
    const label = labelForSegment(seg)
    crumbs.push(isLast ? { label } : { to: acc, label })
  }
  return crumbs
}
