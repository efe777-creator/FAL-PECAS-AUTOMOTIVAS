/**
 * FIND-004 pré-validação dry-run (sem apply).
 * Uso: npx vite-node scripts/find004-preval.run.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { analyzeApplicationMappedRows } from '../src/services/import/applicationImportCore'
import type { ApplicationCatalogs } from '../src/services/import/applicationImportCore'

function loadCatalog(rawPath: string): ApplicationCatalogs {
  const text = readFileSync(rawPath, 'utf8')
  const start = text.indexOf('{')
  const json = JSON.parse(text.slice(start)) as {
    rows: Array<{ catalog: {
      products: Array<{ id: string; sku: string; commercial_ref: string; name: string }>
      makers: Array<{ id: string; name: string }>
      models: Array<{ id: string; manufacturerId: string; name: string }>
      versions: Array<{
        id: string
        manufacturerId: string
        modelId: string
        versionName: string | null
      }>
      pvc: Array<{
        productId: string
        vehicleVersionId: string
        yearStart: number | null
        yearEnd: number | null
      }>
    } }>
  }
  const c = json.rows[0].catalog
  const productsBySku = new Map<string, { id: string; name: string }>()
  for (const p of c.products) {
    productsBySku.set(p.sku.toLowerCase(), { id: p.id, name: p.name })
  }
  return {
    productsBySku,
    makers: c.makers,
    models: c.models,
    versions: c.versions,
    pvc: c.pvc,
  }
}

function parseCsv(path: string): Array<{ lineNumber: number; values: Record<string, string> }> {
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '')
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const header = lines[0].split(';').map((h) => h.trim().toLowerCase())
  const idx = (name: string) => header.indexOf(name)
  const iSku = idx('codigo_fal')
  const iMake = idx('montadora')
  const iModel = idx('modelo')
  const iVer = idx('versao')
  const iStart = idx('ano_inicio')
  const iEnd = idx('ano_fim')
  const rows: Array<{ lineNumber: number; values: Record<string, string> }> = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';')
    rows.push({
      lineNumber: i + 1,
      values: {
        sku: cols[iSku] ?? '',
        name: '',
        montadora: cols[iMake] ?? '',
        modelo: cols[iModel] ?? '',
        versao: cols[iVer] ?? '',
        ano_inicio: cols[iStart] ?? '',
        ano_fim: cols[iEnd] ?? '',
      },
    })
  }
  return rows
}

const root = resolve(import.meta.dirname, '../..')
const csvPath = resolve(root, 'ARQUIVOS IMPORTAÇÕES', 'LISTA SUSP. aplicação FAL.csv')
const catalogPath = resolve(import.meta.dirname, 'find004-catalog-raw.json')
const outPath = resolve(import.meta.dirname, 'find004-preval-result.json')

const catalog = loadCatalog(catalogPath)
const mapped = parseCsv(csvPath)
const preview = analyzeApplicationMappedRows(mapped, catalog)

const skuSet = new Set(mapped.map((r) => r.values.sku.trim()).filter(Boolean))
const blankVersao = mapped.filter((r) => !(r.values.versao ?? '').trim()).length
const blankAnoFim = mapped.filter((r) => !(r.values.ano_fim ?? '').trim()).length
const blankAnoIni = mapped.filter((r) => !(r.values.ano_inicio ?? '').trim()).length

const byAction = {
  new: preview.filter((r) => r.action === 'new').length,
  update: preview.filter((r) => r.action === 'update').length,
  found: preview.filter((r) => r.action === 'found').length,
  already_covered: preview.filter((r) => r.action === 'already_covered').length,
  review: preview.filter((r) => r.action === 'review').length,
  error: preview.filter((r) => r.action === 'error').length,
}

const productMissing = preview.filter((r) => r.action === 'error' && !r.productExists)
const blankVersaoPreview = preview.filter((r) => !(r.versao ?? '').trim())
const blankCreateVersion = blankVersaoPreview.filter((r) => r.createVersion).length
const blankMatchVv = blankVersaoPreview.filter((r) => Boolean(r.vehicleVersionId)).length
const blankReview = blankVersaoPreview.filter((r) => r.action === 'review').length
const blankCsvLines = mapped.filter((r) => !(r.values.versao ?? '').trim()).length
const blankExpandedRatio =
  blankCsvLines > 0 ? blankVersaoPreview.length / blankCsvLines : null

/** Amostra Palio blank: deve expandir para todas as VVs ativas do modelo. */
const palioModel = catalog.models.find((m) => m.name.toLowerCase() === 'palio')
const palioVvs = palioModel
  ? catalog.versions.filter((v) => v.modelId === palioModel.id)
  : []
const palioBlankPreview = blankVersaoPreview.filter(
  (r) => r.modelo.toLowerCase() === 'palio' && r.action !== 'review' && r.action !== 'error',
)
const palioBlankByLine = new Map<number, typeof palioBlankPreview>()
for (const r of palioBlankPreview) {
  const list = palioBlankByLine.get(r.lineNumber) ?? []
  list.push(r)
  palioBlankByLine.set(r.lineNumber, list)
}
const palioSampleLine = [...palioBlankByLine.entries()][0]
const palioSample = palioSampleLine
  ? {
      line: palioSampleLine[0],
      sku: palioSampleLine[1][0]?.sku,
      expandedTo: palioSampleLine[1].length,
      expectedVvs: palioVvs.length,
      vehicleVersionIds: palioSampleLine[1].map((r) => r.vehicleVersionId).sort(),
      yearEnds: [...new Set(palioSampleLine[1].map((r) => r.yearEnd))],
      createVersionAny: palioSampleLine[1].some((r) => r.createVersion),
      coversAllModelVvs:
        palioVvs.length > 0 &&
        palioVvs.every((v) =>
          palioSampleLine[1].some((r) => r.vehicleVersionId === v.id),
        ),
    }
  : null

const openEndBlank = blankVersaoPreview.filter((r) => r.yearEnd == null)
const explicitPreview = preview.filter((r) => Boolean((r.versao ?? '').trim()))
const explicitMulti = explicitPreview.filter((r) => {
  const sameLine = explicitPreview.filter((x) => x.lineNumber === r.lineNumber)
  return sameLine.length > 1
})

const skusNotInDb: string[] = []
for (const sku of skuSet) {
  if (!catalog.productsBySku.has(sku.toLowerCase())) skusNotInDb.push(sku)
}

const commercialOnly: string[] = []
// commercial_ref check from raw catalog products
const text = readFileSync(catalogPath, 'utf8')
const start = text.indexOf('{')
const json = JSON.parse(text.slice(start)) as {
  rows: Array<{ catalog: { products: Array<{ sku: string; commercial_ref: string }> } }>
}
for (const p of json.rows[0].catalog.products) {
  if (p.commercial_ref && p.commercial_ref !== p.sku) {
    commercialOnly.push(`${p.sku}≠${p.commercial_ref}`)
  }
}

const apta = preview.filter((r) => r.applyable && r.action !== 'review').length
const revisar = preview.filter((r) => r.action === 'review').length
const bloqueada = preview.filter((r) => r.action === 'error').length

const sampleErrors = preview
  .filter((r) => r.action === 'error')
  .slice(0, 15)
  .map((r) => ({ line: r.lineNumber, sku: r.sku, message: r.message }))
const sampleReview = preview
  .filter((r) => r.action === 'review')
  .slice(0, 15)
  .map((r) => ({
    line: r.lineNumber,
    sku: r.sku,
    modelo: r.modelo,
    versao: r.versao,
    message: r.message,
  }))
const sampleBlank = blankVersaoPreview.slice(0, 10).map((r) => ({
  line: r.lineNumber,
  sku: r.sku,
  modelo: r.modelo,
  action: r.action,
  createVersion: r.createVersion,
  vehicleVersionId: r.vehicleVersionId,
  message: r.message,
}))

const result = {
  generatedAt: new Date().toISOString(),
  file: 'LISTA SUSP. aplicação FAL.csv',
  csv: {
    rows: mapped.length,
    skusDistinct: skuSet.size,
    blankVersao,
    blankAnoFim,
    blankAnoIni,
  },
  wtbpCatalog: {
    products: catalog.productsBySku.size,
    makers: catalog.makers.length,
    models: catalog.models.length,
    versions: catalog.versions.length,
    pvc: catalog.pvc.length,
  },
  identity: {
    skusNotInDb,
    skusNotInDbCount: skusNotInDb.length,
    commercialRefDiffersFromSkuCount: commercialOnly.length,
    commercialRefDiffersSample: commercialOnly.slice(0, 10),
  },
  previewActions: byAction,
  applyable: preview.filter((r) => r.applyable).length,
  classification: {
    APTA: apta,
    REVISAR: revisar,
    BLOQUEADA: bloqueada,
    note: 'APTA = applyable (new/update/found); REVISAR = review; BLOQUEADA = error',
  },
  blankVersaoBehavior: {
    csvLinesBlank: blankCsvLines,
    previewRows: blankVersaoPreview.length,
    expansionRatio: blankExpandedRatio,
    createVersion: blankCreateVersion,
    matchedVehicleVersionId: blankMatchVv,
    review: blankReview,
    openEndYearNullCount: openEndBlank.length,
    rule: 'blank + modelo resolvido + ≥1 VV → N linhas (1 por VV); 0 VV → createVersion',
  },
  marcha2Checks: {
    palioActiveVvs: palioVvs.length,
    palioBlankSample: palioSample,
    explicitVersionRows: explicitPreview.length,
    explicitSplitOrMultiLineRows: new Set(explicitMulti.map((r) => r.lineNumber)).size,
    note:
      'MARCHA 2: cobertura blank×Palio; ano_fim null preservado; explícitas sem expansão indevida. Apply ainda bloqueado.',
  },
  marcha3Reconciliation: (() => {
    const previewTotal =
      byAction.new +
      byAction.update +
      byAction.found +
      byAction.already_covered +
      byAction.review +
      byAction.error
    const byCsvLine = new Map<number, { actions: Set<string>; applyable: boolean }>()
    for (const r of preview) {
      const cur = byCsvLine.get(r.lineNumber) ?? {
        actions: new Set<string>(),
        applyable: false,
      }
      cur.actions.add(r.action)
      if (r.applyable) cur.applyable = true
      byCsvLine.set(r.lineNumber, cur)
    }
    let csvLinesApplyable = 0
    let csvLinesReviewOnly = 0
    let csvLinesError = 0
    let csvLinesCoveredOnly = 0
    for (const [, v] of byCsvLine) {
      if (v.actions.has('error')) csvLinesError += 1
      else if (v.actions.has('review') && !v.applyable) csvLinesReviewOnly += 1
      else if (v.applyable) csvLinesApplyable += 1
      else if (v.actions.has('already_covered')) csvLinesCoveredOnly += 1
    }
    const reviewLines = [...new Set(preview.filter((r) => r.action === 'review').map((r) => r.lineNumber))]
    return {
      csvRows: mapped.length,
      previewRows: previewTotal,
      expansionDelta: previewTotal - mapped.length,
      previewEquation: `${byAction.new}+${byAction.update}+${byAction.found}+${byAction.already_covered}+${byAction.review}+${byAction.error}=${previewTotal}`,
      csvLineClasses: {
        distinctLinesInPreview: byCsvLine.size,
        applyableOrMixed: csvLinesApplyable,
        reviewOnly: csvLinesReviewOnly,
        error: csvLinesError,
        coveredOnly: csvLinesCoveredOnly,
        note: 'Uma linha CSV blank pode gerar N preview rows; classes são por lineNumber.',
      },
      reviewLineNumbers: reviewLines,
      errorLineNumbers: [...new Set(preview.filter((r) => r.action === 'error').map((r) => r.lineNumber))],
      pendingSource: {
        TDI0150: 'linha inválida/incompleta — não inventar',
        ano_inicio_vazio: '1 ocorrência (TDI0150); decisão de regra geral ainda aberta',
        reviews: reviewLines.length,
      },
      applyBlocked: true,
      note: 'MARCHA 3: reval completa pós blank→VVs. Apply em massa continua BLOQUEADO.',
    }
  })(),
  samples: {
    sampleErrors,
    sampleReview: preview
      .filter((r) => r.action === 'review')
      .map((r) => ({
        line: r.lineNumber,
        sku: r.sku,
        modelo: r.modelo,
        versao: r.versao,
        message: r.message,
      })),
    sampleBlank,
  },
}

writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8')
console.log(JSON.stringify(result, null, 2))
