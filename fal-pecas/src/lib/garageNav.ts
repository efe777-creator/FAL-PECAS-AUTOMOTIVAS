import type { GarageModuleKey } from '@/lib/garageWorkspacePrefs'

/** Navegação da Minha Garagem (layout bento / mockup eFe — cores FAL). */
export type GarageNavItem = {
  key: 'home' | GarageModuleKey
  label: string
  shortLabel: string
  /** Ícone textual compacto (sem emoji de marketing). */
  glyph: string
}

export const GARAGE_SIDEBAR_ITEMS: GarageNavItem[] = [
  { key: 'home', label: 'Minha Garagem', shortLabel: 'Garagem', glyph: '⌂' },
  { key: 'historico', label: 'Histórico', shortLabel: 'Histórico', glyph: '◷' },
  { key: 'manutencoes', label: 'Manutenção', shortLabel: 'Manutenção', glyph: '⚙' },
  { key: 'profissionais', label: 'Profissionais', shortLabel: 'Pro', glyph: '◎' },
  { key: 'evidencias', label: 'Evidências', shortLabel: 'Evidências', glyph: '▣' },
  { key: 'inteligencia', label: 'Inteligência', shortLabel: 'Insights', glyph: '◇' },
  { key: 'visual', label: 'Visual 3D', shortLabel: '3D', glyph: '◻' },
  { key: 'compartilhar', label: 'Compartilhar', shortLabel: 'Share', glyph: '↗' },
  { key: 'config', label: 'Configurações', shortLabel: 'Config', glyph: '☰' },
]

/** Abas do detalhe (inclui visão geral). */
export const GARAGE_MODULE_TABS: { key: GarageModuleKey; label: string }[] = [
  { key: 'visao', label: 'Visão geral' },
  { key: 'historico', label: 'Histórico' },
  { key: 'manutencoes', label: 'Manutenção' },
  { key: 'profissionais', label: 'Profissionais' },
  { key: 'evidencias', label: 'Evidências' },
  { key: 'compartilhar', label: 'Compartilhar' },
  { key: 'inteligencia', label: 'Inteligência' },
  { key: 'visual', label: 'Visual' },
  { key: 'config', label: 'Config' },
]

/** Atalhos mobile na home (grade 2×3). */
export const GARAGE_MOBILE_SHORTCUTS: GarageNavItem[] = [
  { key: 'historico', label: 'Histórico', shortLabel: 'Histórico', glyph: '◷' },
  { key: 'manutencoes', label: 'Manutenção', shortLabel: 'Manutenção', glyph: '⚙' },
  { key: 'profissionais', label: 'Profissionais', shortLabel: 'Pro', glyph: '◎' },
  { key: 'evidencias', label: 'Evidências', shortLabel: 'Evidências', glyph: '▣' },
  { key: 'inteligencia', label: 'Inteligência', shortLabel: 'Insights', glyph: '◇' },
  { key: 'visual', label: '3D', shortLabel: '3D', glyph: '◻' },
]
