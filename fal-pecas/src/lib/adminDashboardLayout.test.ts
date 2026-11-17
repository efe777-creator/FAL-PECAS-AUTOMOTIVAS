import { describe, expect, it } from 'vitest'
import {
  ADMIN_DASHBOARD_LAYOUT_KEY,
  buildDefaultLayout,
  clearDashboardLayout,
  dedupeLayoutItems,
  migrateLayoutRaw,
  readDashboardLayout,
  sanitizeLayoutFile,
  writeDashboardLayout,
  type WidgetSizeBounds,
} from '@/lib/adminDashboardLayout'

function memoryStorage(seed?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(seed ?? {}))
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
  }
}

const bounds = new Map<string, WidgetSizeBounds>([
  [
    'pipeline-flow',
    {
      defaultSize: { w: 12, h: 3 },
      minSize: { w: 6, h: 2 },
      maxSize: { w: 12, h: 5 },
    },
  ],
  [
    'cash-box',
    {
      defaultSize: { w: 6, h: 3 },
      minSize: { w: 4, h: 2 },
      maxSize: { w: 12, h: 5 },
    },
  ],
  [
    'gmv-delivered',
    {
      defaultSize: { w: 3, h: 2 },
      minSize: { w: 2, h: 2 },
      maxSize: { w: 6, h: 3 },
    },
  ],
])

describe('adminDashboardLayout', () => {
  it('dedupeLayoutItems remove duplicatas por widgetId', () => {
    const items = dedupeLayoutItems([
      {
        instanceId: 'a',
        widgetId: 'cash-box',
        x: 0,
        y: 0,
        w: 6,
        h: 3,
      },
      {
        instanceId: 'b',
        widgetId: 'cash-box',
        x: 0,
        y: 3,
        w: 6,
        h: 3,
      },
      {
        instanceId: 'c',
        widgetId: 'pipeline-flow',
        x: 0,
        y: 6,
        w: 12,
        h: 3,
      },
    ])
    expect(items).toHaveLength(2)
    expect(items.map((i) => i.widgetId)).toEqual(['cash-box', 'pipeline-flow'])
  })

  it('sanitize dropa widgets não autorizados e retired', () => {
    const allowed = new Set(['pipeline-flow'])
    const file = sanitizeLayoutFile(
      {
        version: 1,
        updatedAt: '2026-01-01T00:00:00.000Z',
        items: [
          {
            instanceId: '1',
            widgetId: 'pipeline-flow',
            x: 0,
            y: 0,
            w: 12,
            h: 3,
          },
          {
            instanceId: '2',
            widgetId: 'cash-box',
            x: 0,
            y: 3,
            w: 6,
            h: 3,
          },
          {
            instanceId: '3',
            widgetId: 'gmv-delivered',
            x: 6,
            y: 3,
            w: 3,
            h: 2,
          },
        ],
      },
      bounds,
      allowed,
    )
    expect(file?.items).toHaveLength(1)
    expect(file?.items[0]?.widgetId).toBe('pipeline-flow')
  })

  it('JSON corrompido → fallback default', () => {
    const storage = memoryStorage({ [ADMIN_DASHBOARD_LAYOUT_KEY]: '{broken' })
    const allowed = new Set(['pipeline-flow', 'cash-box'])
    const file = readDashboardLayout(
      bounds,
      allowed,
      ['pipeline-flow'],
      storage,
    )
    expect(file.items.map((i) => i.widgetId)).toEqual(['pipeline-flow'])
  })

  it('migrateLayoutRaw adiciona version ausente', () => {
    const migrated = migrateLayoutRaw({
      items: [],
    }) as { version: number }
    expect(migrated.version).toBe(1)
  })

  it('persiste layout vazio sem restaurar default', () => {
    const storage = memoryStorage()
    const allowed = new Set(['pipeline-flow'])
    writeDashboardLayout(
      { version: 1, updatedAt: new Date().toISOString(), items: [] },
      bounds,
      allowed,
      storage,
    )
    const file = readDashboardLayout(
      bounds,
      allowed,
      ['pipeline-flow'],
      storage,
    )
    expect(file.items).toEqual([])
  })

  it('buildDefaultLayout empilha Ops-first', () => {
    const file = buildDefaultLayout(
      ['pipeline-flow', 'cash-box'],
      bounds,
    )
    expect(file.version).toBe(1)
    expect(file.items[0]?.y).toBe(0)
    expect(file.items[1]?.y).toBe(file.items[0]!.h)
  })

  it('clearDashboardLayout remove chave', () => {
    const storage = memoryStorage({
      [ADMIN_DASHBOARD_LAYOUT_KEY]: '{"version":1,"items":[]}',
    })
    clearDashboardLayout(storage)
    expect(storage.getItem(ADMIN_DASHBOARD_LAYOUT_KEY)).toBeNull()
  })
})
