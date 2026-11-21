import { describe, expect, it } from 'vitest'
import {
  GARAGE_MOBILE_SHORTCUTS,
  GARAGE_MODULE_TABS,
  GARAGE_MORE_ADVANCED_KEYS,
  GARAGE_MORE_LABELS,
  GARAGE_MORE_PRIMARY_KEYS,
  GARAGE_SIDEBAR_ITEMS,
} from '@/lib/garageNav'
import { GARAGE_MORE_MODULE_KEYS } from '@/lib/garageWorkspacePrefs'

describe('garageNav anti-regressão padrão UX (fundação 2026-11-21)', () => {
  it('sidebar primária: Garagem, Histórico, Peças, Mais (sem Cuidados)', () => {
    expect(GARAGE_SIDEBAR_ITEMS.map((i) => i.key)).toEqual([
      'home',
      'historico',
      'pecas',
      'mais',
    ])
    expect(GARAGE_SIDEBAR_ITEMS.map((i) => i.label)).toEqual([
      'Garagem',
      'Histórico',
      'Peças',
      'Mais',
    ])
    expect(GARAGE_SIDEBAR_ITEMS.some((i) => i.key === 'inteligencia')).toBe(false)
  })

  it('abas do detalhe: Resumo, Histórico, Peças, Mais', () => {
    expect(GARAGE_MODULE_TABS.map((t) => t.key)).toEqual([
      'visao',
      'historico',
      'pecas',
      'mais',
    ])
    expect(GARAGE_MODULE_TABS.map((t) => t.label)).toEqual([
      'Resumo',
      'Histórico',
      'Peças',
      'Mais',
    ])
  })

  it('atalhos mobile incluem Peças sem home e sem Cuidados', () => {
    expect(GARAGE_MOBILE_SHORTCUTS.map((i) => i.key)).toEqual([
      'historico',
      'pecas',
      'mais',
    ])
    expect(GARAGE_MOBILE_SHORTCUTS.every((i) => i.key !== 'home')).toBe(true)
    expect(GARAGE_MOBILE_SHORTCUTS.every((i) => i.key !== 'inteligencia')).toBe(true)
  })

  it('Mais agrupa Visual/Config/Compartilhar + Avançado (sem Peças)', () => {
    expect(GARAGE_MORE_PRIMARY_KEYS).toEqual(['visual', 'config', 'compartilhar'])
    expect(GARAGE_MORE_ADVANCED_KEYS).toEqual([
      'inteligencia',
      'manutencoes',
      'profissionais',
      'evidencias',
    ])
    expect(GARAGE_MORE_MODULE_KEYS).toEqual([
      'visual',
      'config',
      'compartilhar',
      'inteligencia',
      'manutencoes',
      'profissionais',
      'evidencias',
    ])
    expect(GARAGE_MORE_MODULE_KEYS).not.toContain('pecas')
    expect(GARAGE_MORE_LABELS.inteligencia).toBe('Cuidados')
  })

  it('labels não usam jargão Engine/G7/2B/Inteligência', () => {
    const blob = [
      ...GARAGE_SIDEBAR_ITEMS.map((i) => i.label),
      ...GARAGE_MODULE_TABS.map((t) => t.label),
    ]
      .join(' ')
      .toLowerCase()
    expect(blob).not.toMatch(/engine|g7|2b|glb|tripo|inteligência|inteligencia/)
  })
})
