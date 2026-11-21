export type GarageModuleKey =
  | 'visao'
  | 'historico'
  | 'manutencoes'
  | 'profissionais'
  | 'evidencias'
  | 'compartilhar'
  | 'inteligencia'
  | 'visual'
  | 'config'
  | 'mais'
  | 'pecas'

const MODULES: GarageModuleKey[] = [
  'visao',
  'historico',
  'manutencoes',
  'profissionais',
  'evidencias',
  'compartilhar',
  'inteligencia',
  'visual',
  'config',
  'mais',
  'pecas',
]

/**
 * Módulos sob Mais (fora da nav primária).
 * Ordem: Visual → Config → Compartilhar → Avançado (Cuidados, Manutenção, …).
 */
export const GARAGE_MORE_MODULE_KEYS: Exclude<
  GarageModuleKey,
  'visao' | 'historico' | 'mais' | 'pecas'
>[] = [
  'visual',
  'config',
  'compartilhar',
  'inteligencia',
  'manutencoes',
  'profissionais',
  'evidencias',
]

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
  if (raw && (MODULES as string[]).includes(raw)) return raw as GarageModuleKey
  const last = readGarageWorkspacePrefs().lastModule
  if (last && (MODULES as string[]).includes(last)) return last
  return 'visao'
}
