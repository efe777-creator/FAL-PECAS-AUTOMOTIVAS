import type { GarageModuleKey } from '@/lib/garageWorkspacePrefs'

/** Navegação da Minha Garagem — um caminho por intenção (padrão UX 2026-11-18). */
export type GarageNavItem = {
  key: 'home' | GarageModuleKey
  label: string
  shortLabel: string
  glyph: string
}

/** Sidebar / primária: Garagem, Histórico, Cuidados, Peças, Mais. */
export const GARAGE_SIDEBAR_ITEMS: GarageNavItem[] = [
  { key: 'home', label: 'Garagem', shortLabel: 'Garagem', glyph: '⌂' },
  { key: 'historico', label: 'Histórico', shortLabel: 'Histórico', glyph: '◷' },
  { key: 'inteligencia', label: 'Cuidados', shortLabel: 'Cuidados', glyph: '◇' },
  { key: 'pecas', label: 'Peças', shortLabel: 'Peças', glyph: '▣' },
  { key: 'mais', label: 'Mais', shortLabel: 'Mais', glyph: '☰' },
]

/** Abas do detalhe — espelham a nav primária (+ Resumo). */
export const GARAGE_MODULE_TABS: { key: GarageModuleKey; label: string }[] = [
  { key: 'visao', label: 'Resumo' },
  { key: 'historico', label: 'Histórico' },
  { key: 'inteligencia', label: 'Cuidados' },
  { key: 'pecas', label: 'Peças' },
  { key: 'mais', label: 'Mais' },
]

/** Atalhos mobile na home (sem repetir a lista longa de módulos). */
export const GARAGE_MOBILE_SHORTCUTS: GarageNavItem[] = [
  { key: 'historico', label: 'Histórico', shortLabel: 'Histórico', glyph: '◷' },
  { key: 'inteligencia', label: 'Cuidados', shortLabel: 'Cuidados', glyph: '◇' },
  { key: 'pecas', label: 'Peças', shortLabel: 'Peças', glyph: '▣' },
  { key: 'mais', label: 'Mais', shortLabel: 'Mais', glyph: '☰' },
]

/** Rótulos dos itens dentro de Mais. */
export const GARAGE_MORE_LABELS: Record<string, string> = {
  manutencoes: 'Manutenção',
  visual: 'Visualização',
  profissionais: 'Profissionais',
  evidencias: 'Evidências',
  compartilhar: 'Compartilhar',
  config: 'Configurações',
}
