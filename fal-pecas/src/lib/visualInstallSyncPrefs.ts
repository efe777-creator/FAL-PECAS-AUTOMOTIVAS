const KEY = 'fal-garage-visual-sync-install-v1'

/** Opt-in: refletir instalações 2A no modelo. Default OFF (visual ≠ fato). */
export function readSyncInstallEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function writeSyncInstallEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(KEY, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
}
