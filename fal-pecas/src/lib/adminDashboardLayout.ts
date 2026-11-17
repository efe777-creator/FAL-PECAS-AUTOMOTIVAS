/**
 * Persistência versionada do layout do Painel (Marcha A).
 * Chave separada dos pins (`adminDashboardPrefs`).
 */

export const ADMIN_DASHBOARD_LAYOUT_KEY = 'fal-admin-dashboard-layout-v1'
export const DASHBOARD_LAYOUT_VERSION = 1 as const
export const DASHBOARD_GRID_COLS = 12

export type DashboardLayoutItem = {
  instanceId: string
  widgetId: string
  x: number
  y: number
  w: number
  h: number
}

export type DashboardLayoutFileV1 = {
  version: typeof DASHBOARD_LAYOUT_VERSION
  updatedAt: string
  items: DashboardLayoutItem[]
}

export type WidgetSizeBounds = {
  defaultSize: { w: number; h: number }
  minSize: { w: number; h: number }
  maxSize: { w: number; h: number }
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function defaultStorage(): StorageLike | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

function isFiniteInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function createInstanceId(widgetId: string): string {
  return `${widgetId}__${Math.random().toString(36).slice(2, 9)}`
}

/** Uma instância por widgetId; remove duplicatas preservando a primeira. */
export function dedupeLayoutItems(
  items: readonly DashboardLayoutItem[],
): DashboardLayoutItem[] {
  const seen = new Set<string>()
  const out: DashboardLayoutItem[] = []
  for (const item of items) {
    if (seen.has(item.widgetId)) continue
    seen.add(item.widgetId)
    out.push(item)
  }
  return out
}

export function sanitizeLayoutItem(
  raw: unknown,
  boundsByWidgetId: ReadonlyMap<string, WidgetSizeBounds>,
  allowedWidgetIds: ReadonlySet<string>,
): DashboardLayoutItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const widgetId = typeof r.widgetId === 'string' ? r.widgetId.trim() : ''
  if (!widgetId || !allowedWidgetIds.has(widgetId)) return null
  const bounds = boundsByWidgetId.get(widgetId)
  if (!bounds) return null

  const minW = bounds.minSize.w
  const minH = bounds.minSize.h
  const maxW = Math.min(DASHBOARD_GRID_COLS, bounds.maxSize.w)
  const maxH = bounds.maxSize.h

  let w = isFiniteInt(r.w) ? r.w : bounds.defaultSize.w
  let h = isFiniteInt(r.h) ? r.h : bounds.defaultSize.h
  w = clamp(Math.round(w), minW, maxW)
  h = clamp(Math.round(h), minH, maxH)

  let x = isFiniteInt(r.x) ? Math.round(r.x) : 0
  let y = isFiniteInt(r.y) ? Math.round(r.y) : 0
  x = clamp(x, 0, DASHBOARD_GRID_COLS - w)
  y = Math.max(0, y)

  const instanceId =
    typeof r.instanceId === 'string' && r.instanceId.trim()
      ? r.instanceId.trim()
      : createInstanceId(widgetId)

  return { instanceId, widgetId, x, y, w, h }
}

export function sanitizeLayoutFile(
  raw: unknown,
  boundsByWidgetId: ReadonlyMap<string, WidgetSizeBounds>,
  allowedWidgetIds: ReadonlySet<string>,
): DashboardLayoutFileV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (r.version !== 1) return null
  if (!Array.isArray(r.items)) return null

  const items: DashboardLayoutItem[] = []
  for (const entry of r.items) {
    const item = sanitizeLayoutItem(entry, boundsByWidgetId, allowedWidgetIds)
    if (item) items.push(item)
  }
  const deduped = dedupeLayoutItems(items)
  const updatedAt =
    typeof r.updatedAt === 'string' && r.updatedAt
      ? r.updatedAt
      : new Date().toISOString()

  return { version: 1, updatedAt, items: deduped }
}

export function migrateLayoutRaw(raw: unknown): unknown {
  // v1 only for now — future versions map here
  if (!raw || typeof raw !== 'object') return raw
  const r = raw as Record<string, unknown>
  if (r.version == null && Array.isArray(r.items)) {
    return { ...r, version: 1 }
  }
  return raw
}

export function buildDefaultLayout(
  widgetIdsInOrder: readonly string[],
  boundsByWidgetId: ReadonlyMap<string, WidgetSizeBounds>,
): DashboardLayoutFileV1 {
  const items: DashboardLayoutItem[] = []
  let cursorY = 0
  for (const widgetId of widgetIdsInOrder) {
    const bounds = boundsByWidgetId.get(widgetId)
    if (!bounds) continue
    const w = clamp(bounds.defaultSize.w, bounds.minSize.w, Math.min(DASHBOARD_GRID_COLS, bounds.maxSize.w))
    const h = clamp(bounds.defaultSize.h, bounds.minSize.h, bounds.maxSize.h)
    items.push({
      instanceId: createInstanceId(widgetId),
      widgetId,
      x: 0,
      y: cursorY,
      w,
      h,
    })
    cursorY += h
  }
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    items,
  }
}

export function readDashboardLayout(
  boundsByWidgetId: ReadonlyMap<string, WidgetSizeBounds>,
  allowedWidgetIds: ReadonlySet<string>,
  defaultWidgetIds: readonly string[],
  storage: StorageLike | null = defaultStorage(),
): DashboardLayoutFileV1 {
  const fallback = () =>
    buildDefaultLayout(defaultWidgetIds, boundsByWidgetId)

  if (!storage) return fallback()
  try {
    const raw = storage.getItem(ADMIN_DASHBOARD_LAYOUT_KEY)
    if (!raw) return fallback()
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return fallback()
    }
    const migrated = migrateLayoutRaw(parsed)
    const sanitized = sanitizeLayoutFile(
      migrated,
      boundsByWidgetId,
      allowedWidgetIds,
    )
    if (!sanitized) return fallback()
    // Layout vazio explícito (usuário removeu tudo) é válido
    return sanitized
  } catch {
    return fallback()
  }
}

export function writeDashboardLayout(
  file: DashboardLayoutFileV1,
  boundsByWidgetId: ReadonlyMap<string, WidgetSizeBounds>,
  allowedWidgetIds: ReadonlySet<string>,
  storage: StorageLike | null = defaultStorage(),
): DashboardLayoutFileV1 {
  const sanitized =
    sanitizeLayoutFile(
      { ...file, version: 1, updatedAt: new Date().toISOString() },
      boundsByWidgetId,
      allowedWidgetIds,
    ) ?? { version: 1 as const, updatedAt: new Date().toISOString(), items: [] }

  if (storage) {
    try {
      storage.setItem(ADMIN_DASHBOARD_LAYOUT_KEY, JSON.stringify(sanitized))
    } catch {
      /* quota */
    }
  }
  return sanitized
}

export function clearDashboardLayout(
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return
  try {
    storage.removeItem(ADMIN_DASHBOARD_LAYOUT_KEY)
  } catch {
    /* */
  }
}

/** Converte items → layout RGL (i = instanceId). */
export function toRglLayout(
  items: readonly DashboardLayoutItem[],
  boundsByWidgetId: ReadonlyMap<string, WidgetSizeBounds>,
): Array<{
  i: string
  x: number
  y: number
  w: number
  h: number
  minW: number
  minH: number
  maxW: number
  maxH: number
}> {
  return items.map((item) => {
    const b = boundsByWidgetId.get(item.widgetId)
    return {
      i: item.instanceId,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: b?.minSize.w ?? 2,
      minH: b?.minSize.h ?? 2,
      maxW: Math.min(DASHBOARD_GRID_COLS, b?.maxSize.w ?? DASHBOARD_GRID_COLS),
      maxH: b?.maxSize.h ?? 12,
    }
  })
}

export function fromRglLayout(
  rgl: ReadonlyArray<{ i: string; x: number; y: number; w: number; h: number }>,
  prev: readonly DashboardLayoutItem[],
): DashboardLayoutItem[] {
  const byInstance = new Map(prev.map((p) => [p.instanceId, p]))
  const out: DashboardLayoutItem[] = []
  for (const cell of rgl) {
    const prevItem = byInstance.get(cell.i)
    if (!prevItem) continue
    out.push({
      instanceId: prevItem.instanceId,
      widgetId: prevItem.widgetId,
      x: cell.x,
      y: cell.y,
      w: cell.w,
      h: cell.h,
    })
  }
  return dedupeLayoutItems(out)
}
