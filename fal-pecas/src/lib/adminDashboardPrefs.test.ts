import { describe, expect, it } from 'vitest'
import {
  ADMIN_DASHBOARD_PREFS_KEY,
  readAdminDashboardPrefs,
  sanitizePinnedPaths,
  togglePinnedPath,
  writeAdminDashboardPrefs,
} from '@/lib/adminDashboardPrefs'
import {
  ADMIN_DASHBOARD_DEFAULT_PINS,
  defaultPinnedPathsForRole,
  listDashboardShortcutsForRole,
} from '@/lib/adminDashboardShortcuts'

function memoryStorage(seed?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(seed ?? {}))
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
  }
}

const ALLOWED = [
  '/admin/pedidos',
  '/admin/avisos',
  '/admin/estoque',
  '/admin/logistica',
  '/admin/pagamentos',
  '/admin/relatorios',
]

describe('adminDashboardPrefs', () => {
  it('sanitizePinnedPaths filtra inválidos e duplicados', () => {
    expect(
      sanitizePinnedPaths(
        ['/admin/pedidos', '  ', '/admin/x', '/admin/pedidos', '/admin/avisos'],
        ALLOWED,
      ),
    ).toEqual(['/admin/pedidos', '/admin/avisos'])
  })

  it('read usa defaults do role quando storage vazio', () => {
    const storage = memoryStorage()
    const prefs = readAdminDashboardPrefs(ALLOWED, 'administrador', storage)
    expect(prefs.pinned).toEqual(
      ADMIN_DASHBOARD_DEFAULT_PINS.filter((p) => ALLOWED.includes(p)),
    )
  })

  it('read/write round-trip', () => {
    const storage = memoryStorage()
    writeAdminDashboardPrefs(
      { pinned: ['/admin/pedidos', '/admin/relatorios'] },
      ALLOWED,
      storage,
    )
    const raw = storage.getItem(ADMIN_DASHBOARD_PREFS_KEY)
    expect(raw).toContain('/admin/relatorios')
    const prefs = readAdminDashboardPrefs(ALLOWED, 'gerente', storage)
    expect(prefs.pinned).toEqual(['/admin/pedidos', '/admin/relatorios'])
  })

  it('togglePinnedPath adiciona e remove', () => {
    expect(togglePinnedPath('/admin/avisos', ['/admin/pedidos'], ALLOWED)).toEqual([
      '/admin/pedidos',
      '/admin/avisos',
    ])
    expect(
      togglePinnedPath('/admin/pedidos', ['/admin/pedidos', '/admin/avisos'], ALLOWED),
    ).toEqual(['/admin/avisos'])
    expect(togglePinnedPath('/admin/x', ['/admin/pedidos'], ALLOWED)).toEqual([
      '/admin/pedidos',
    ])
  })

  it('persiste pinned vazio sem restaurar defaults', () => {
    const storage = memoryStorage()
    writeAdminDashboardPrefs({ pinned: [] }, ALLOWED, storage)
    const prefs = readAdminDashboardPrefs(ALLOWED, 'administrador', storage)
    expect(prefs.pinned).toEqual([])
  })
})

describe('adminDashboardShortcuts', () => {
  it('filtra atalhos por role', () => {
    const admin = listDashboardShortcutsForRole('administrador').map((s) => s.to)
    expect(admin).toContain('/admin/pagamentos')
    expect(admin).toContain('/admin/relatorios')

    const stock = listDashboardShortcutsForRole('estoque').map((s) => s.to)
    expect(stock).toContain('/admin/estoque')
    expect(stock).not.toContain('/admin/pagamentos')
    expect(stock).not.toContain('/admin/relatorios')
  })

  it('defaults pináveis respeitam role', () => {
    const pins = defaultPinnedPathsForRole('atendimento')
    expect(pins).toContain('/admin/pedidos')
    expect(pins).toContain('/admin/avisos')
    expect(pins).not.toContain('/admin/estoque')
  })
})
