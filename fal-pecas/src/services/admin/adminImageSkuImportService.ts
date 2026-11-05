import { isLikelyImageFile, skuKeyFromImageFilename } from '@/lib/skuFromImageFilename'
import { getSupabase } from '@/lib/supabase'
import { adminUploadImage } from '@/services/admin/adminImageService'

export type ImageSkuMatchStatus = 'ok' | 'skip' | 'error'

export type ImageSkuMatchRow = {
  fileName: string
  key: string | null
  productId: string | null
  productLabel: string | null
  status: ImageSkuMatchStatus
  message: string
}

type ProductHit = {
  id: string
  sku: string
  commercial_ref: string | null
  name: string
}

function norm(s: string): string {
  return s.trim().toLowerCase()
}

async function loadProductsByKeys(keys: string[]): Promise<Map<string, ProductHit[]>> {
  const map = new Map<string, ProductHit[]>()
  const unique = [...new Set(keys.map((k) => k.trim()).filter(Boolean))]
  if (!unique.length) return map

  const sb = getSupabase()
  const chunkSize = 80
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const [{ data: bySku, error: e1 }, { data: byRef, error: e2 }] = await Promise.all([
      sb.from('products').select('id, sku, commercial_ref, name').in('sku', chunk),
      sb.from('products').select('id, sku, commercial_ref, name').in('commercial_ref', chunk),
    ])
    if (e1) throw e1
    if (e2) throw e2

    for (const row of [...(bySku ?? []), ...(byRef ?? [])] as ProductHit[]) {
      const keysFor = new Set<string>()
      keysFor.add(norm(row.sku))
      if (row.commercial_ref?.trim()) keysFor.add(norm(row.commercial_ref))
      for (const k of keysFor) {
        const list = map.get(k) ?? []
        if (!list.some((p) => p.id === row.id)) list.push(row)
        map.set(k, list)
      }
    }
  }
  return map
}

async function productsWithAnyImage(productIds: string[]): Promise<Set<string>> {
  const out = new Set<string>()
  if (!productIds.length) return out
  const sb = getSupabase()
  const chunkSize = 100
  for (let i = 0; i < productIds.length; i += chunkSize) {
    const chunk = productIds.slice(i, i + chunkSize)
    const { data, error } = await sb.from('product_images').select('product_id').in('product_id', chunk)
    if (error) throw error
    for (const row of data ?? []) out.add(String((row as { product_id: string }).product_id))
  }
  return out
}

/** Prévia: casa arquivo → produto (SKU ou código referência). */
export async function adminPreviewImageSkuImport(
  files: File[],
  opts?: { skipIfHasImage?: boolean },
): Promise<ImageSkuMatchRow[]> {
  const skipIfHasImage = opts?.skipIfHasImage ?? false
  const rows: ImageSkuMatchRow[] = []
  const keys: string[] = []

  for (const file of files) {
    if (!isLikelyImageFile(file)) {
      rows.push({
        fileName: file.name,
        key: null,
        productId: null,
        productLabel: null,
        status: 'error',
        message: 'Arquivo não é imagem',
      })
      continue
    }
    const key = skuKeyFromImageFilename(file.name)
    if (!key) {
      rows.push({
        fileName: file.name,
        key: null,
        productId: null,
        productLabel: null,
        status: 'error',
        message: 'Nome sem SKU reconhecível',
      })
      continue
    }
    keys.push(key)
    rows.push({
      fileName: file.name,
      key,
      productId: null,
      productLabel: null,
      status: 'ok',
      message: '—',
    })
  }

  const productMap = await loadProductsByKeys(keys)
  const pendingIds: string[] = []

  for (const row of rows) {
    if (row.status === 'error' || !row.key) continue
    const hits = productMap.get(norm(row.key)) ?? []
    if (hits.length === 0) {
      row.status = 'error'
      row.message = 'SKU/código não encontrado'
      continue
    }
    if (hits.length > 1) {
      row.status = 'error'
      row.message = `Ambíguo (${hits.length} produtos)`
      continue
    }
    const p = hits[0]!
    row.productId = p.id
    row.productLabel = `${p.sku} · ${p.name}`
    row.message = 'Pronto'
    pendingIds.push(p.id)
  }

  if (skipIfHasImage && pendingIds.length) {
    const withImg = await productsWithAnyImage(pendingIds)
    for (const row of rows) {
      if (row.status !== 'ok' || !row.productId) continue
      if (withImg.has(row.productId)) {
        row.status = 'skip'
        row.message = 'Já tem imagem — pulado'
      }
    }
  }

  return rows
}

export type ImageSkuApplyProgress = {
  done: number
  total: number
  currentFile: string | null
}

export type ImageSkuApplyResult = {
  ok: number
  skip: number
  error: number
  rows: ImageSkuMatchRow[]
}

/** Aplica uploads na ordem; reporta progresso. */
export async function adminApplyImageSkuImport(
  files: File[],
  preview: ImageSkuMatchRow[],
  onProgress?: (p: ImageSkuApplyProgress) => void,
): Promise<ImageSkuApplyResult> {
  const byName = new Map(files.map((f) => [f.name, f]))
  const out: ImageSkuMatchRow[] = preview.map((r) => ({ ...r }))
  const total = out.filter((r) => r.status === 'ok').length
  let done = 0
  let ok = 0
  let skip = 0
  let error = 0

  for (const row of out) {
    if (row.status === 'skip') {
      skip += 1
      continue
    }
    if (row.status === 'error') {
      error += 1
      continue
    }
    const file = byName.get(row.fileName)
    if (!file || !row.productId) {
      row.status = 'error'
      row.message = 'Arquivo ausente na aplicação'
      error += 1
      continue
    }
    onProgress?.({ done, total, currentFile: row.fileName })
    try {
      await adminUploadImage(row.productId, file)
      row.status = 'ok'
      row.message = 'Enviado'
      ok += 1
    } catch (err) {
      row.status = 'error'
      row.message = err instanceof Error ? err.message : 'Falha no upload'
      error += 1
    }
    done += 1
    onProgress?.({ done, total, currentFile: row.fileName })
  }

  onProgress?.({ done: total, total, currentFile: null })
  return { ok, skip, error, rows: out }
}
