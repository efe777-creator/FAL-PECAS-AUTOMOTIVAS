import { readPendingGarageVehicle } from '@/services/plates/pendingGarage'

function safeInternalPath(path: string | null | undefined): string | null {
  const t = (path ?? '').trim()
  if (!t.startsWith('/')) return null
  if (t.startsWith('//')) return null
  return t
}

/**
 * Destino pós-login/cadastro: state da navegação, senão returnTo do pending da garagem.
 */
export function resolveAuthReturnPath(
  fromState: string | null | undefined,
  fallback = '/conta',
): string {
  return (
    safeInternalPath(fromState) ??
    safeInternalPath(readPendingGarageVehicle()?.returnTo) ??
    fallback
  )
}
