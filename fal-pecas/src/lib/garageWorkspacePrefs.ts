export type GarageModuleKey =
  | 'visao'
  | 'historico'
  | 'config'

const KEY = 'fal-garage-workspace-v1'

export type GarageWorkspacePrefs = {
  lastModule?: GarageModuleKey
}

export function readGarageWorkspacePrefs(): GarageWorkspacePrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    return JSON.parse(raw) as GarageWorkspacePrefs
  } catch {
    return {}
  }
}

export function writeGarageWorkspacePrefs(patch: GarageWorkspacePrefs): GarageWorkspacePrefs {
  const next = { ...readGarageWorkspacePrefs(), ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
  return next
}

export function parseGarageModule(raw: string | null): GarageModuleKey {
  if (raw === 'historico' || raw === 'config' || raw === 'visao') return raw
  return readGarageWorkspacePrefs().lastModule ?? 'visao'
}
