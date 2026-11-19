import { describe, expect, it } from 'vitest'
import {
  GARAGE_MOBILE_SHORTCUTS,
  GARAGE_MODULE_TABS,
  GARAGE_SIDEBAR_ITEMS,
} from '@/lib/garageNav'

describe('garageNav anti-regressão layout bento', () => {
  it('sidebar inclui home e módulos críticos do mockup', () => {
    const keys = GARAGE_SIDEBAR_ITEMS.map((i) => i.key)
    expect(keys).toContain('home')
    expect(keys).toContain('historico')
    expect(keys).toContain('manutencoes')
    expect(keys).toContain('visual')
    expect(keys).toContain('inteligencia')
    expect(keys).toContain('config')
  })

  it('abas da ficha cobrem GarageModuleKey usados na detail', () => {
    const keys = GARAGE_MODULE_TABS.map((t) => t.key)
    expect(keys).toEqual([
      'visao',
      'historico',
      'manutencoes',
      'profissionais',
      'evidencias',
      'compartilhar',
      'inteligencia',
      'visual',
      'config',
    ])
  })

  it('atalhos mobile são 6 itens sem home', () => {
    expect(GARAGE_MOBILE_SHORTCUTS).toHaveLength(6)
    expect(GARAGE_MOBILE_SHORTCUTS.every((i) => i.key !== 'home')).toBe(true)
  })

  it('labels da sidebar não usam jargão Engine/G7/2B', () => {
    const blob = GARAGE_SIDEBAR_ITEMS.map((i) => i.label).join(' ')
    expect(blob.toLowerCase()).not.toMatch(/engine|g7|2b|glb|tripo/)
  })
})
