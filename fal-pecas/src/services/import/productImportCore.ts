/**
 * Motor puro — Frente A cadastro de produto + split HF (Frente C).
 */

import { normalizeImportText } from '@/services/import/normalizeText'

export type ProductImportAction = 'create' | 'update' | 'error'

export type CanonicalPosicao = 'DIANTEIRA' | 'TRASEIRA'
export type CanonicalLado = 'ESQUERDO' | 'DIREITO' | 'AMBOS'

export type ProductPreviewRow = {
  lineNumber: number
  sku: string
  name: string
  categoria: string
  grupo: string
  subgrupo: string
  posicao: CanonicalPosicao | null
  lado: CanonicalLado | null
  /** Raw inválido (quando erro). */
  posicaoRaw: string
  ladoRaw: string
  descricaoCurta: string
  descricao: string
  action: ProductImportAction
  productId: string | null
  applyable: boolean
  message: string
  warnings: string[]
  /** Linhas do arquivo consolidadas neste SKU (HF). */
  sourceLines: number[]
}

function foldKey(input: string): string {
  return normalizeImportText(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '')
}

/** Normaliza posição HF → canônico. Vazio → null. Inválido → { ok:false }. */
export function normalizePosicao(
  raw: string | null | undefined,
): { ok: true; value: CanonicalPosicao | null } | { ok: false; raw: string } {
  const t = normalizeImportText(raw)
  if (!t) return { ok: true, value: null }
  const k = foldKey(t)
  if (['DIANT', 'DIANTEIRA', 'DIANTEIRO'].includes(k)) {
    return { ok: true, value: 'DIANTEIRA' }
  }
  if (['TRAS', 'TRASEIRA', 'TRASEIRO'].includes(k)) {
    return { ok: true, value: 'TRASEIRA' }
  }
  return { ok: false, raw: t }
}

/** Normaliza lado HF → canônico. Vazio → null. Inválido → { ok:false }. */
export function normalizeLado(
  raw: string | null | undefined,
): { ok: true; value: CanonicalLado | null } | { ok: false; raw: string } {
  const t = normalizeImportText(raw)
  if (!t) return { ok: true, value: null }
  const k = foldKey(t)
  if (['LE', 'ESQUERDO', 'ESQ'].includes(k)) return { ok: true, value: 'ESQUERDO' }
  if (['LD', 'DIREITO', 'DIR'].includes(k)) return { ok: true, value: 'DIREITO' }
  if (['LD/LE', 'LE/LD', 'AMBOS', 'LDLE', 'LELD'].includes(k)) {
    return { ok: true, value: 'AMBOS' }
  }
  return { ok: false, raw: t }
}

export function productFrozenPayload(row: ProductPreviewRow): Record<string, unknown> {
  return {
    action: row.action,
    applyable: row.applyable,
    sku: row.sku,
    name: row.name,
    categoria: row.categoria,
    grupo: row.grupo,
    subgrupo: row.subgrupo || null,
    posicao: row.posicao,
    lado: row.lado,
    descricao_curta: row.descricaoCurta || null,
    descricao: row.descricao || null,
    product_id: row.productId,
    create_product: row.action === 'create',
  }
}

/**
 * Consolida linhas mapeadas em 1 produto por SKU.
 * Primeira linha com valor válido vence; divergências → warning.
 */
export function consolidateProductRows(
  rows: Array<{ lineNumber: number; values: Record<string, string> }>,
  existingBySku: Map<string, string>,
): ProductPreviewRow[] {
  type Acc = {
    lineNumber: number
    sourceLines: number[]
    sku: string
    name: string
    categoria: string
    grupo: string
    subgrupo: string
    posicao: CanonicalPosicao | null
    lado: CanonicalLado | null
    posicaoInvalid: string | null
    ladoInvalid: string | null
    descricaoCurta: string
    descricao: string
    warnings: string[]
  }

  const bySku = new Map<string, Acc>()
  const order: string[] = []

  for (const row of rows) {
    const sku = normalizeImportText(row.values.sku)
    const name = normalizeImportText(row.values.name)
    const categoria = normalizeImportText(row.values.categoria)
    const grupo = normalizeImportText(row.values.grupo)
    const subgrupo = normalizeImportText(row.values.subgrupo)
    const descricaoCurta = normalizeImportText(row.values.descricao_curta)
    const descricao = normalizeImportText(row.values.descricao)
    const posN = normalizePosicao(row.values.posicao)
    const ladoN = normalizeLado(row.values.lado)

    if (!sku) continue
    const key = sku.toLowerCase()
    const prev = bySku.get(key)
    if (!prev) {
      bySku.set(key, {
        lineNumber: row.lineNumber,
        sourceLines: [row.lineNumber],
        sku,
        name,
        categoria,
        grupo,
        subgrupo,
        posicao: posN.ok ? posN.value : null,
        lado: ladoN.ok ? ladoN.value : null,
        posicaoInvalid: posN.ok ? null : posN.raw,
        ladoInvalid: ladoN.ok ? null : ladoN.raw,
        descricaoCurta,
        descricao,
        warnings: [],
      })
      order.push(key)
      continue
    }

    prev.sourceLines.push(row.lineNumber)
    const warn = (field: string, a: string, b: string) => {
      if (a && b && a.toLowerCase() !== b.toLowerCase()) {
        prev.warnings.push(
          `Linha ${row.lineNumber}: ${field} divergente (“${b}”); mantido “${a}”.`,
        )
      }
    }
    warn('nome', prev.name, name)
    warn('categoria', prev.categoria, categoria)
    warn('grupo', prev.grupo, grupo)
    warn('subgrupo', prev.subgrupo, subgrupo)
    if (posN.ok && posN.value) {
      if (prev.posicao && prev.posicao !== posN.value) {
        prev.warnings.push(
          `Linha ${row.lineNumber}: posição divergente (“${posN.value}”); mantido “${prev.posicao}”.`,
        )
      } else if (!prev.posicao) {
        prev.posicao = posN.value
      }
    } else if (!posN.ok && !prev.posicaoInvalid) {
      prev.posicaoInvalid = posN.raw
    }
    if (ladoN.ok && ladoN.value) {
      if (prev.lado && prev.lado !== ladoN.value) {
        prev.warnings.push(
          `Linha ${row.lineNumber}: lado divergente (“${ladoN.value}”); mantido “${prev.lado}”.`,
        )
      } else if (!prev.lado) {
        prev.lado = ladoN.value
      }
    } else if (!ladoN.ok && !prev.ladoInvalid) {
      prev.ladoInvalid = ladoN.raw
    }
    if (!prev.name && name) prev.name = name
    if (!prev.categoria && categoria) prev.categoria = categoria
    if (!prev.grupo && grupo) prev.grupo = grupo
    if (!prev.subgrupo && subgrupo) prev.subgrupo = subgrupo
    if (!prev.descricaoCurta && descricaoCurta) prev.descricaoCurta = descricaoCurta
    if (!prev.descricao && descricao) prev.descricao = descricao
  }

  return order.map((key) => {
    const a = bySku.get(key)!
    const errors: string[] = []
    if (!a.name) errors.push('Informe o nome do produto.')
    if (!a.categoria) errors.push('Informe a categoria.')
    if (!a.grupo) errors.push('Informe o grupo.')
    if (a.posicaoInvalid) errors.push(`Posição inválida (“${a.posicaoInvalid}”).`)
    if (a.ladoInvalid) errors.push(`Lado inválido (“${a.ladoInvalid}”).`)

    const productId = existingBySku.get(key) ?? null
    const base = {
      lineNumber: a.lineNumber,
      sku: a.sku,
      name: a.name,
      categoria: a.categoria,
      grupo: a.grupo,
      subgrupo: a.subgrupo,
      posicao: a.posicao,
      lado: a.lado,
      posicaoRaw: a.posicaoInvalid ?? '',
      ladoRaw: a.ladoInvalid ?? '',
      descricaoCurta: a.descricaoCurta,
      descricao: a.descricao,
      productId,
      warnings: a.warnings,
      sourceLines: a.sourceLines,
    }

    if (errors.length) {
      return {
        ...base,
        action: 'error' as const,
        applyable: false,
        message: errors.join(' '),
      }
    }

    const action: ProductImportAction = productId ? 'update' : 'create'
    return {
      ...base,
      action,
      applyable: true,
      message:
        action === 'create'
          ? 'Novo cadastro (rascunho, indisponível)'
          : 'Será atualizado o cadastro',
    }
  })
}

/** Split HF: produtos consolidados + linhas de aplicação (uma por linha fonte). */
export function splitHfMappedRows(
  rows: Array<{ lineNumber: number; values: Record<string, string> }>,
): {
  productMapped: Array<{ lineNumber: number; values: Record<string, string> }>
  applicationMapped: Array<{ lineNumber: number; values: Record<string, string> }>
} {
  const productMapped = rows.map((r) => ({
    lineNumber: r.lineNumber,
    values: {
      sku: r.values.sku ?? '',
      name: r.values.name ?? '',
      categoria: r.values.categoria ?? '',
      grupo: r.values.grupo ?? '',
      subgrupo: r.values.subgrupo ?? '',
      posicao: r.values.posicao ?? '',
      lado: r.values.lado ?? '',
      descricao_curta: r.values.descricao_curta ?? '',
      descricao: r.values.descricao ?? '',
    },
  }))

  const applicationMapped = rows.map((r) => ({
    lineNumber: r.lineNumber,
    values: {
      sku: r.values.sku ?? '',
      name: r.values.name ?? '',
      montadora: r.values.montadora ?? '',
      modelo: r.values.modelo ?? '',
      versao: r.values.versao ?? '',
      ano_inicio: r.values.ano_inicio ?? '',
      ano_fim: r.values.ano_fim ?? '',
    },
  }))

  return { productMapped, applicationMapped }
}
