const KEY = 'fal-admin-theme'

export type AdminTheme = 'dark' | 'light'

/** Default admin = dark (plano tático V2). */
export function readAdminTheme(): AdminTheme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* SSR / private mode */
  }
  return 'dark'
}

export function writeAdminTheme(theme: AdminTheme): void {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* ignore */
  }
}

export function toggleAdminTheme(current: AdminTheme): AdminTheme {
  return current === 'dark' ? 'light' : 'dark'
}
