const KEY = 'fal-store-theme'

export type StoreTheme = 'dark' | 'light'

/** Default loja = light (identidade clara; dark opcional). */
export function readStoreTheme(): StoreTheme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* SSR / private mode */
  }
  return 'light'
}

export function writeStoreTheme(theme: StoreTheme): void {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* ignore */
  }
}

export function toggleStoreTheme(current: StoreTheme): StoreTheme {
  return current === 'dark' ? 'light' : 'dark'
}
