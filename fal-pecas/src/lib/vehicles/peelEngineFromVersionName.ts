/**
 * Remove o motor do início de version_name quando ele é repetido (ex.: Sentra "2.0 SV CVT"
 * com engine "2.0" → versão "SV CVT"). Não inventa dado — só peela prefixo igual.
 */
export function peelEngineFromVersionName(
  engine: string | null | undefined,
  versionName: string | null | undefined,
): string | null {
  const eng = (engine ?? '').trim()
  const ver = (versionName ?? '').trim()
  if (!ver) return null
  if (!eng) return ver

  const escaped = eng.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`^${escaped}(?:\\s*[-–/,]?\\s*|\\s+)`, 'i')
  const peeled = ver.replace(re, '').trim()
  if (!peeled || peeled.toLowerCase() === ver.toLowerCase()) {
    // Prefixo idêntico sem resto → versão vazia (só motor)
    if (ver.toLowerCase() === eng.toLowerCase()) return null
    return ver
  }
  return peeled
}
