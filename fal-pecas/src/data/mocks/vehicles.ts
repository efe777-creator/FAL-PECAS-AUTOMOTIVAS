/**
 * DEMO / MOCK — árvore de veículos fictícia.
 * Chaves de ano/motor/versão: maker|model e maker|model|year.
 */
import type { VehicleOptionTree } from '@/types'
import { MOCK_DISCLAIMER } from './categories'

export { MOCK_DISCLAIMER }

export const mockVehicleTree: VehicleOptionTree = {
  makers: ['Volkswagen', 'Chevrolet', 'Fiat', 'Hyundai', 'Toyota', 'Honda'],
  modelsByMaker: {
    Volkswagen: ['Gol', 'Voyage', 'Polo', 'T-Cross'],
    Chevrolet: ['Onix', 'Prisma', 'Tracker', 'S10'],
    Fiat: ['Argo', 'Cronos', 'Strada', 'Toro'],
    Hyundai: ['HB20', 'Creta', 'i30'],
    Toyota: ['Corolla', 'Etios', 'Hilux'],
    Honda: ['Civic', 'City', 'HR-V'],
  },
  yearsByModel: {
    'Volkswagen|Gol': ['2018', '2019', '2020', '2021', '2022'],
    'Volkswagen|Voyage': ['2018', '2019', '2020', '2021'],
    'Volkswagen|Polo': ['2019', '2020', '2021', '2022', '2023'],
    'Volkswagen|T-Cross': ['2020', '2021', '2022', '2023'],
    'Chevrolet|Onix': ['2018', '2019', '2020', '2021', '2022', '2023'],
    'Chevrolet|Prisma': ['2018', '2019', '2020'],
    'Chevrolet|Tracker': ['2021', '2022', '2023'],
    'Chevrolet|S10': ['2019', '2020', '2021', '2022'],
    'Fiat|Argo': ['2018', '2019', '2020', '2021', '2022'],
    'Fiat|Cronos': ['2019', '2020', '2021', '2022'],
    'Fiat|Strada': ['2020', '2021', '2022', '2023'],
    'Fiat|Toro': ['2019', '2020', '2021', '2022'],
    'Hyundai|HB20': ['2018', '2019', '2020', '2021', '2022'],
    'Hyundai|Creta': ['2019', '2020', '2021', '2022', '2023'],
    'Hyundai|i30': ['2018', '2019'],
    'Toyota|Corolla': ['2018', '2019', '2020', '2021', '2022', '2023'],
    'Toyota|Etios': ['2018', '2019', '2020'],
    'Toyota|Hilux': ['2019', '2020', '2021', '2022'],
    'Honda|Civic': ['2018', '2019', '2020', '2021'],
    'Honda|City': ['2019', '2020', '2021', '2022'],
    'Honda|HR-V': ['2019', '2020', '2021', '2022', '2023'],
  },
  enginesByModelYear: {
    'Chevrolet|Onix|2020': ['1.0', '1.0 Turbo'],
    'Chevrolet|Onix|2021': ['1.0', '1.0 Turbo'],
    'Volkswagen|Gol|2020': ['1.0', '1.6'],
    'Hyundai|HB20|2020': ['1.0', '1.6'],
    'Toyota|Corolla|2020': ['2.0', '1.8 Hybrid'],
    'Fiat|Argo|2020': ['1.0', '1.3', '1.8'],
  },
  enginesByModel: {
    'Chevrolet|Onix': ['1.0', '1.0 Turbo'],
    'Volkswagen|Gol': ['1.0', '1.6'],
    'Fiat|Argo': ['1.0', '1.3', '1.8'],
  },
  versionsByModel: {
    'Volkswagen|Gol': ['Trendline', 'Comfortline'],
    'Chevrolet|Onix': ['LT', 'LTZ'],
  },
}
