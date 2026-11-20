import { useGarageOptional } from '@/contexts/GarageContext'
import {
  classifyCardCompatibility,
  vehicleFilterToCompatInput,
  type CompatibilityVerdict,
} from '@/services/compatibility/compatibilityEngine'
import { loadPvcEvidenceByProductIds } from '@/services/compatibility/loadPvcEvidence'
import { useEffect, useMemo, useState } from 'react'

/**
 * Reavalia fit (M11 lite) para uma lista de productIds sob o veículo ativo.
 * Sem fit → mapa vazio (não inventa selo).
 */
export function useProductCompatVerdicts(productIds: string[]): {
  loading: boolean
  verdicts: Map<string, CompatibilityVerdict>
} {
  const garage = useGarageOptional()
  const input = useMemo(
    () => vehicleFilterToCompatInput(garage?.activeFilter),
    [garage?.activeFilter],
  )
  const idsKey = useMemo(
    () => [...new Set(productIds.filter(Boolean))].sort().join('|'),
    [productIds],
  )
  const [loading, setLoading] = useState(false)
  const [verdicts, setVerdicts] = useState<Map<string, CompatibilityVerdict>>(
    () => new Map(),
  )

  useEffect(() => {
    if (!input || !idsKey) {
      setVerdicts(new Map())
      setLoading(false)
      return
    }
    const ids = idsKey.split('|').filter(Boolean)
    let cancelled = false
    setLoading(true)
    void loadPvcEvidenceByProductIds(ids)
      .then((map) => {
        if (cancelled) return
        const next = new Map<string, CompatibilityVerdict>()
        for (const id of ids) {
          next.set(id, classifyCardCompatibility(input, map.get(id) ?? []))
        }
        setVerdicts(next)
      })
      .catch(() => {
        if (cancelled) return
        const next = new Map<string, CompatibilityVerdict>()
        for (const id of ids) {
          next.set(id, classifyCardCompatibility(input, []))
        }
        setVerdicts(next)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [input, idsKey])

  return { loading, verdicts }
}
