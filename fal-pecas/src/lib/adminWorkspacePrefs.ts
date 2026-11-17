/**
 * Persistência do Adaptive Workspace — ortogonal ao layout RGL do Painel.
 * Nunca escrever em fal-admin-dashboard-layout-v1.
 */

export const ADMIN_WORKSPACE_KEY = 'fal-admin-workspace-v1'
export const WORKSPACE_VERSION = 1 as const
export const WORKSPACE_SPLIT_DEFAULT = 420
export const WORKSPACE_SPLIT_MIN = 360
export const WORKSPACE_SPLIT_MAX = 640

export type WorkspaceMode = 'split' | 'expanded' | 'fullscreen' | 'collapsed'
export type WorkspaceModuleKey = 'orders' | 'dashboard'

export type WorkspaceModulePrefs = {
  mode: WorkspaceMode
  splitWidthPx: number
}

export type WorkspaceFileV1 = {
  version: typeof WORKSPACE_VERSION
  updatedAt: string
  modules: Partial<Record<WorkspaceModuleKey, WorkspaceModulePrefs>>
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const MODES: readonly WorkspaceMode[] = [
  'split',
  'expanded',
  'fullscreen',
  'collapsed',
] as const

function defaultStorage(): StorageLike | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

export function defaultModulePrefs(): WorkspaceModulePrefs {
  return { mode: 'collapsed', splitWidthPx: WORKSPACE_SPLIT_DEFAULT }
}

export function clampSplitWidth(px: number): number {
  if (!Number.isFinite(px)) return WORKSPACE_SPLIT_DEFAULT
  return Math.min(WORKSPACE_SPLIT_MAX, Math.max(WORKSPACE_SPLIT_MIN, Math.round(px)))
}

function sanitizeMode(v: unknown): WorkspaceMode {
  return typeof v === 'string' && (MODES as readonly string[]).includes(v)
    ? (v as WorkspaceMode)
    : 'collapsed'
}

function sanitizeModule(raw: unknown): WorkspaceModulePrefs {
  const d = defaultModulePrefs()
  if (!raw || typeof raw !== 'object') return d
  const o = raw as Record<string, unknown>
  return {
    mode: sanitizeMode(o.mode),
    splitWidthPx: clampSplitWidth(
      typeof o.splitWidthPx === 'number' ? o.splitWidthPx : d.splitWidthPx,
    ),
  }
}

export function readWorkspaceFile(storage: StorageLike | null = defaultStorage()): WorkspaceFileV1 {
  const empty: WorkspaceFileV1 = {
    version: WORKSPACE_VERSION,
    updatedAt: new Date(0).toISOString(),
    modules: {},
  }
  if (!storage) return empty
  try {
    const raw = storage.getItem(ADMIN_WORKSPACE_KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Partial<WorkspaceFileV1>
    if (parsed.version !== WORKSPACE_VERSION) return empty
    const modules: WorkspaceFileV1['modules'] = {}
    if (parsed.modules && typeof parsed.modules === 'object') {
      for (const key of ['orders', 'dashboard'] as WorkspaceModuleKey[]) {
        if (parsed.modules[key]) modules[key] = sanitizeModule(parsed.modules[key])
      }
    }
    return {
      version: WORKSPACE_VERSION,
      updatedAt:
        typeof parsed.updatedAt === 'string' ? parsed.updatedAt : empty.updatedAt,
      modules,
    }
  } catch {
    return empty
  }
}

export function readModulePrefs(
  moduleKey: WorkspaceModuleKey,
  storage: StorageLike | null = defaultStorage(),
): WorkspaceModulePrefs {
  const file = readWorkspaceFile(storage)
  return file.modules[moduleKey] ?? defaultModulePrefs()
}

export function writeModulePrefs(
  moduleKey: WorkspaceModuleKey,
  prefs: WorkspaceModulePrefs,
  storage: StorageLike | null = defaultStorage(),
): WorkspaceModulePrefs {
  const nextPrefs: WorkspaceModulePrefs = {
    mode: sanitizeMode(prefs.mode),
    splitWidthPx: clampSplitWidth(prefs.splitWidthPx),
  }
  if (!storage) return nextPrefs
  const file = readWorkspaceFile(storage)
  const next: WorkspaceFileV1 = {
    version: WORKSPACE_VERSION,
    updatedAt: new Date().toISOString(),
    modules: {
      ...file.modules,
      [moduleKey]: nextPrefs,
    },
  }
  try {
    storage.setItem(ADMIN_WORKSPACE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
  return nextPrefs
}
