import type { VehicleVersion } from '@/types'

/** Copy única — hub Aplicações + ficha produto (busca cliente / coringa). */
export const PVC_CASCADE_HINT =
  'Cascata: montadora → modelo → motorização → versão → período. Na busca do cliente: motor ou versão em branco na config = serve para todas; se cadastrado (ex.: Unique / 1.0) = só aquela.'

export function pvcEngineOptions(versions: VehicleVersion[]): string[] {
  const set = new Set<string>()
  for (const v of versions) {
    const e = (v.engine ?? '').trim()
    if (e) set.add(e)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function pvcVersionNameOptions(versions: VehicleVersion[], engine: string): string[] {
  const filtered = engine
    ? versions.filter((v) => (v.engine ?? '').trim() === engine)
    : versions
  const set = new Set<string>()
  for (const v of filtered) {
    const name = (v.versionName ?? '').trim()
    if (name) set.add(name)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function pvcMatchingVersions(
  versions: VehicleVersion[],
  engine: string,
  versionName: string,
): VehicleVersion[] {
  return versions.filter((v) => {
    if (engine && (v.engine ?? '').trim() !== engine) return false
    if (versionName && (v.versionName ?? '').trim() !== versionName) return false
    return true
  })
}
