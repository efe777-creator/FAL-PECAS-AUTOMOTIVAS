/** Desktop: menu fixo expandido ou trilho de ícones (expande no hover). */

export type AdminSidebarMode = 'expanded' | 'rail'

const KEY = 'fal-admin-sidebar-collapsed'

/** `true` = trilho (ícones); `false` = expandido fixo. */
export function readAdminSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

export function writeAdminSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(KEY, collapsed ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function readAdminSidebarMode(): AdminSidebarMode {
  return readAdminSidebarCollapsed() ? 'rail' : 'expanded'
}

export function writeAdminSidebarMode(mode: AdminSidebarMode): void {
  writeAdminSidebarCollapsed(mode === 'rail')
}
