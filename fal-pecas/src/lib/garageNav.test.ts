import { describe, expect, it } from 'vitest'
import {
  GARAGE_MOBILE_SHORTCUTS,
  GARAGE_MODULE_TABS,
  GARAGE_SIDEBAR_ITEMS,
} from '@/lib/garageNav'
import { GARAGE_MORE_MODULE_KEYS } from '@/lib/garageWorkspacePrefs'

describe('garageNav anti-regressão padrão UX', () => {
  it('sidebar primária: Garagem, Histórico, Cuidados, Mais', () => {
    expect(GARAGE_SIDEBAR_ITEMS.map((i) => i.key)).toEqual([
      'home',
      'historico',
      'inteligencia',
      'mais',
    ])
    expect(GARAGE_SIDEBAR_ITEMS.map((i) => i.label)).toEqual([
      'Garagem',
      'Histórico',
      'Cuidados',
      'Mais',
    ])
  })

  it('abas do detalhe: Resumo, Histórico, Cuidados, Mais', () => {
    expect(GARAGE_MODULE_TABS.map((t) => t.key)).toEqual([
      'visao',
      'historico',
      'inteligencia',
      'mais',
    ])
    expect(GARAGE_MODULE_TABS.map((t) => t.label)).toEqual([
      'Resumo',
      'Histórico',
      'Cuidados',
      'Mais',
    ])
  })

  it('atalhos mobile são 3 essenciais sem home', () => {
    expect(GARAGE_MOBILE_SHORTCUTS).toHaveLength(3)
    expect(GARAGE_MOBILE_SHORTCUTS.every((i) => i.key !== 'home')).toBe(true)
  })

  it('Mais agrupa módulos avançados', () => {
    expect(GARAGE_MORE_MODULE_KEYS).toEqual([
      'manutencoes',
      'visual',
      'profissionais',
      'evidencias',
      'compartilhar',
      'config',
    ])
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
