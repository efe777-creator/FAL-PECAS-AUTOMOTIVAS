/**
 * Notes #8 — header mobile enxuto (logo + busca + menu).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = readFileSync(resolve(__dirname, 'Header.tsx'), 'utf8')

describe('Header mobile declutter (Notes #8)', () => {
  it('não empilha tema/garagem/sino no topo mobile', () => {
    expect(src).toMatch(/Mobile: só menu/)
    // Theme/garage/bell só no bloco lg:flex (desktop) + tema no drawer
    const mobileTopCluster = src.slice(
      src.indexOf('<SearchBar />'),
      src.indexOf('<NavBar />'),
    )
    expect(mobileTopCluster).not.toMatch(/lg:hidden[\s\S]*StoreThemeToggle/)
    expect(mobileTopCluster).not.toMatch(/lg:hidden[\s\S]*GarageActiveSwitcher/)
    expect(mobileTopCluster).not.toMatch(/lg:hidden[\s\S]*NotificationBell/)
    expect(mobileTopCluster).toMatch(/Abrir menu/)
  })

  it('drawer oferece tema e garagem', () => {
    const drawer = src.slice(src.indexOf('<MobileDrawer'))
    expect(drawer).toMatch(/StoreThemeToggle/)
    expect(drawer).toMatch(/GarageActiveSwitcher/)
    expect(drawer).toMatch(/Aparência/)
  })

  it('drawer inclui Central de Suporte', () => {
    const drawer = src.slice(src.indexOf('<MobileDrawer'))
    expect(drawer).toMatch(/to="\/suporte"/)
    expect(drawer).toMatch(/Central de Suporte/)
  })
})
