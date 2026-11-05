/** Espelho de src/lib/shippingPacking.ts — manter regras iguais (O1-C packing v1). */

export type PackingBox = {
  id: string
  name: string
  lengthCm: number
  widthCm: number
  heightCm: number
  emptyWeightKg: number
  maxWeightKg: number | null
  active: boolean
}

export type PackingItem = {
  lengthCm: number
  widthCm: number
  heightCm: number
  weightKg: number
  qty: number
}

export function pickSmallestFittingBox(
  boxes: PackingBox[],
  items: PackingItem[],
): PackingBox | null {
  const active = boxes.filter((b) => b.active)
  if (!active.length || !items.length) return null
  let volume = 0
  let weight = 0
  for (const it of items) {
    const q = Math.max(1, it.qty)
    volume += it.lengthCm * it.widthCm * it.heightCm * q
    weight += it.weightKg * q
  }
  const candidates = active
    .map((b) => ({
      box: b,
      vol: b.lengthCm * b.widthCm * b.heightCm,
      totalWeight: weight + b.emptyWeightKg,
    }))
    .filter(
      (c) =>
        c.vol >= volume &&
        (c.box.maxWeightKg == null || c.totalWeight <= c.box.maxWeightKg),
    )
    .sort((a, b) => a.vol - b.vol)
  return candidates[0]?.box ?? null
}

export function sumItemsWeightKg(items: PackingItem[]): number {
  return items.reduce((n, it) => n + it.weightKg * Math.max(1, it.qty), 0)
}
