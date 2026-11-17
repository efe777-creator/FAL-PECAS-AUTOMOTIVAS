export type DashboardPeriodPreset =
  | 'today'
  | 'last_7'
  | 'last_30'
  | 'this_month'

export type DashboardPeriodRange = {
  preset: DashboardPeriodPreset
  from: string // YYYY-MM-DD
  to: string
  label: string
}

/** Data civil America/Sao_Paulo aproximada via offset local do browser em ISO date. */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function resolveDashboardPeriod(
  preset: DashboardPeriodPreset,
  now: Date = new Date(),
): DashboardPeriodRange {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let start = new Date(end)

  switch (preset) {
    case 'today':
      break
    case 'last_7':
      start.setDate(end.getDate() - 6)
      break
    case 'last_30':
      start.setDate(end.getDate() - 29)
      break
    case 'this_month':
      start = new Date(end.getFullYear(), end.getMonth(), 1)
      break
  }

  const labels: Record<DashboardPeriodPreset, string> = {
    today: 'Hoje',
    last_7: 'Últimos 7 dias',
    last_30: 'Últimos 30 dias',
    this_month: 'Este mês',
  }

  return {
    preset,
    from: toIsoDate(start),
    to: toIsoDate(end),
    label: labels[preset],
  }
}

export const DASHBOARD_PERIOD_PRESETS: readonly DashboardPeriodPreset[] = [
  'today',
  'last_7',
  'last_30',
  'this_month',
] as const
