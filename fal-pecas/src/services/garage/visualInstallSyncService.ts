import { listVehicleEvents } from '@/services/garage/vehicleEventService'
import { listVehiclePartEvents } from '@/services/garage/vehiclePartEventService'
import {
  collectInstallFactsFromEvents,
  collectInstallFactsFromG7,
  mergeInstallFacts,
  type VisualInstallFact,
} from '@/services/garage/visualInstallSync'

/** Lê fatos de instalação 2A (G7 + vehicle_events). Somente leitura. */
export async function listVisualInstallFacts(input: {
  vehicleIdentityId: string
  membershipId: string
}): Promise<VisualInstallFact[]> {
  const [events, partEvents] = await Promise.all([
    listVehicleEvents(input.vehicleIdentityId),
    listVehiclePartEvents(input.membershipId),
  ])
  return mergeInstallFacts(
    collectInstallFactsFromG7(partEvents),
    collectInstallFactsFromEvents(events),
  )
}
