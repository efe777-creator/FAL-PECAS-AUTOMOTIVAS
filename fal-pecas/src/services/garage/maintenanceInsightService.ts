import { getLatestOdometerKm } from '@/services/garage/odometerService'
import { listVehicleMaintenances } from '@/services/garage/maintenanceService'
import {
  listMaintenanceSchedules,
  type MaintenanceSchedule,
} from '@/services/garage/maintenanceScheduleService'

export type InsightKind = 'reminder' | 'gap' | 'info'

export type MaintenanceInsight = {
  id: string
  kind: InsightKind
  /** Sempre etiquetar: estimado | declarado | confirmado | sistema */
  confidence: 'estimado' | 'declarado' | 'sistema'
  title: string
  detail: string
  sourceLabel: string
}

/**
 * Gera insights a partir de schedules + km + histórico.
 * Estimativa ≠ diagnóstico — nunca inventa falha mecânica.
 */
export function buildMaintenanceInsights(input: {
  schedules: MaintenanceSchedule[]
  latestKm: number | null
  maintenanceCount: number
  now?: Date
}): MaintenanceInsight[] {
  const now = input.now ?? new Date()
  const out: MaintenanceInsight[] = []

  if (input.latestKm == null) {
    out.push({
      id: 'gap-km',
      kind: 'gap',
      confidence: 'sistema',
      title: 'Sem quilometragem registrada',
      detail:
        'Ausência de km ≠ zero. Registre uma leitura para lembretes por quilometragem.',
      sourceLabel: 'Sistema · lacuna',
    })
  }

  if (input.maintenanceCount === 0 && input.schedules.length === 0) {
    out.push({
      id: 'gap-maint',
      kind: 'gap',
      confidence: 'sistema',
      title: 'Sem manutenções nem lembretes',
      detail:
        'Cadastre um lembrete (óleo, filtros, revisão) ou registre uma manutenção já feita.',
      sourceLabel: 'Sistema · lacuna',
    })
  }

  for (const s of input.schedules.filter((x) => x.active)) {
    const dueSoonDays =
      s.nextDueAt != null
        ? (new Date(s.nextDueAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        : null
    const dueKm =
      s.nextDueKm != null && input.latestKm != null
        ? s.nextDueKm - input.latestKm
        : null

    const overdueTime = dueSoonDays != null && dueSoonDays < 0
    const overdueKm = dueKm != null && dueKm < 0
    const soonTime = dueSoonDays != null && dueSoonDays >= 0 && dueSoonDays <= 30
    const soonKm = dueKm != null && dueKm >= 0 && dueKm <= 1000

    if (overdueTime || overdueKm) {
      out.push({
        id: `overdue-${s.id}`,
        kind: 'reminder',
        confidence: s.source === 'estimated' ? 'estimado' : 'declarado',
        title: `${s.title} — vencido (estimativa de lembrete)`,
        detail: [
          overdueTime && s.nextDueAt
            ? `Data prevista ${new Date(s.nextDueAt).toLocaleDateString('pt-BR')}`
            : null,
          overdueKm && s.nextDueKm != null
            ? `Km previsto ${s.nextDueKm.toLocaleString('pt-BR')}`
            : null,
          'Isto não é diagnóstico mecânico — apenas o lembrete que você configurou.',
        ]
          .filter(Boolean)
          .join(' · '),
        sourceLabel: sourceLabel(s),
      })
    } else if (soonTime || soonKm) {
      out.push({
        id: `soon-${s.id}`,
        kind: 'reminder',
        confidence: s.source === 'estimated' ? 'estimado' : 'declarado',
        title: `${s.title} — próximo`,
        detail: [
          soonTime && dueSoonDays != null
            ? `Em cerca de ${Math.ceil(dueSoonDays)} dia(s)`
            : null,
          soonKm && dueKm != null ? `Em cerca de ${dueKm.toLocaleString('pt-BR')} km` : null,
          'Estimativa com base no intervalo informado — não é diagnóstico.',
        ]
          .filter(Boolean)
          .join(' · '),
        sourceLabel: sourceLabel(s),
      })
    } else {
      out.push({
        id: `ok-${s.id}`,
        kind: 'info',
        confidence: 'declarado',
        title: s.title,
        detail: 'Dentro do intervalo configurado (enquanto houver dados).',
        sourceLabel: sourceLabel(s),
      })
    }
  }

  return out
}

function sourceLabel(s: MaintenanceSchedule): string {
  const map: Record<string, string> = {
    customer: 'Cliente',
    system: 'Sistema',
    estimated: 'Estimado',
    professional: 'Profissional',
  }
  return `${map[s.source] ?? s.source} · lembrete`
}

export async function listInsightsForIdentity(
  vehicleIdentityId: string,
): Promise<MaintenanceInsight[]> {
  const [schedules, latestKm, maints] = await Promise.all([
    listMaintenanceSchedules(vehicleIdentityId),
    getLatestOdometerKm(vehicleIdentityId),
    listVehicleMaintenances(vehicleIdentityId),
  ])
  return buildMaintenanceInsights({
    schedules,
    latestKm,
    maintenanceCount: maints.length,
  })
}
