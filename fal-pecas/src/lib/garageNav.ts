import type { GarageModuleKey } from '@/lib/garageWorkspacePrefs'

/** Navegação da Minha Garagem — um caminho por intenção (padrão UX emenda 2026-11-21). */
export type GarageNavItem = {
  key: 'home' | GarageModuleKey
  label: string
  shortLabel: string
  glyph: string
}

/** Sidebar / primária: Garagem, Histórico, Peças, Mais (Cuidados → Avançado). */
export const GARAGE_SIDEBAR_ITEMS: GarageNavItem[] = [
  { key: 'home', label: 'Garagem', shortLabel: 'Garagem', glyph: '⌂' },
  { key: 'historico', label: 'Histórico', shortLabel: 'Histórico', glyph: '◷' },
  { key: 'pecas', label: 'Peças', shortLabel: 'Peças', glyph: '▣' },
  { key: 'mais', label: 'Mais', shortLabel: 'Mais', glyph: '☰' },
]

/** Abas do detalhe — espelham a nav primária (+ Resumo). */
export const GARAGE_MODULE_TABS: { key: GarageModuleKey; label: string }[] = [
  { key: 'visao', label: 'Resumo' },
  { key: 'historico', label: 'Histórico' },
  { key: 'pecas', label: 'Peças' },
  { key: 'mais', label: 'Mais' },
]

/** Atalhos mobile na home (sem repetir a lista longa de módulos). */
export const GARAGE_MOBILE_SHORTCUTS: GarageNavItem[] = [
  { key: 'historico', label: 'Histórico', shortLabel: 'Histórico', glyph: '◷' },
  { key: 'pecas', label: 'Peças', shortLabel: 'Peças', glyph: '▣' },
  { key: 'mais', label: 'Mais', shortLabel: 'Mais', glyph: '☰' },
]

/** Itens de primeiro nível em Mais (antes de Avançado). */
export const GARAGE_MORE_PRIMARY_KEYS = [
  'visual',
  'config',
  'compartilhar',
] as const

/** Avançado — fora do caminho feliz até parceiros. */
export const GARAGE_MORE_ADVANCED_KEYS = [
  'inteligencia',
  'manutencoes',
  'profissionais',
  'evidencias',
] as const

/** Rótulos dos itens dentro de Mais. */
export const GARAGE_MORE_LABELS: Record<string, string> = {
  visual: 'Visualização',
  config: 'Configurações',
  compartilhar: 'Compartilhar',
  inteligencia: 'Cuidados',
  manutencoes: 'Manutenção',
  profissionais: 'Profissionais',
  evidencias: 'Evidências',
}
