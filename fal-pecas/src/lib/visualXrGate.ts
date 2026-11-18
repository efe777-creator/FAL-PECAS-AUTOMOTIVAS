/** Fase C — gate XR explícito. Default OFF. */

const USER_KEY = 'fal-garage-visual-xr-v1'

/** Build-time gate. Sem isto, UI de XR nem aparece. */
export function isVisualXrEnvEnabled(): boolean {
  try {
    return String(import.meta.env.VITE_FAL_VISUAL_XR ?? '') === '1'
  } catch {
    return false
  }
}

export function readVisualXrUserOptIn(): boolean {
  if (!isVisualXrEnvEnabled()) return false
  try {
    return localStorage.getItem(USER_KEY) === '1'
  } catch {
    return false
  }
}

export function writeVisualXrUserOptIn(enabled: boolean): void {
  if (!isVisualXrEnvEnabled()) return
  try {
    localStorage.setItem(USER_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/** Gate composto (env + opt-in usuário). */
export function isVisualXrEnabled(): boolean {
  return isVisualXrEnvEnabled() && readVisualXrUserOptIn()
}

export function canUseWebXrApi(): boolean {
  return typeof navigator !== 'undefined' && 'xr' in navigator && Boolean(navigator.xr)
}

/**
 * Verifica suporte a sessão imersiva (AR preferida, senão VR).
 * Sem API → false.
 */
export async function detectWebXrSupport(): Promise<{
  supported: boolean
  mode: 'immersive-ar' | 'immersive-vr' | null
}> {
  if (!canUseWebXrApi() || !navigator.xr) {
    return { supported: false, mode: null }
  }
  try {
    if (await navigator.xr.isSessionSupported('immersive-ar')) {
      return { supported: true, mode: 'immersive-ar' }
    }
    if (await navigator.xr.isSessionSupported('immersive-vr')) {
      return { supported: true, mode: 'immersive-vr' }
    }
  } catch {
    return { supported: false, mode: null }
  }
  return { supported: false, mode: null }
}
