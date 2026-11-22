/**
 * FAL — plate-lookup (AJUSTE-028)
 *
 * PLATE_PROVIDER=mock | apiplacas
 * Se PLATE_PROVIDER omitido e APIPLACAS_TOKEN existir → apiplacas.
 * Secrets: APIPLACAS_TOKEN (nunca VITE_) · APIPLACAS_BASE_URL opcional
 * Endpoint: GET https://wdapi2.com.br/v3/basico/{placa}
 */
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'
import {
  isValidPlate,
  normalizePlate,
  type NormalizedPlateLookupResult,
  type PlateLookupProvider,
} from '../_shared/plateProvider.ts'
import { mockPlateProvider } from '../_shared/mockPlateProvider.ts'
import { createApiPlacasPlateProvider } from '../_shared/apiPlacasPlateProvider.ts'
import { resolveVehicleAgainstCatalog } from '../_shared/vehicleResolver.ts'
import { assertModelClean } from '../_shared/splitApiModelo.ts'
import {
  isInvResolverEnabled,
  resolveVehicleIdentity,
} from '../_shared/resolveVehicleIdentity.ts'
import { loadVehicleAliases } from '../_shared/loadVehicleAliases.ts'

/** Corrige modelo composto em cache antigo / feeds que misturam motor+versão no modelo. */
function enrichFromCompositeModelo(input: {
  maker: string
  model: string
  year?: string | number | null
  engine?: string | null
  version?: string | null
}) {
  const cleaned = assertModelClean(input.model, {
    engine: input.engine,
    version: input.version,
  })
  return {
    maker: input.maker,
    model: cleaned.model || input.model,
    year: input.year ?? null,
    engine: cleaned.engine,
    version: cleaned.version,
  }
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const RATE_WINDOW_MS = 60_000
const RATE_MAX_PER_WINDOW = 20

const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function clientKey(req: Request): string {
  const auth = req.headers.get('authorization') ?? ''
  const fwd = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? 'anon'
  return `${auth.slice(0, 24)}::${fwd.split(',')[0]?.trim()}`
}

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (bucket.count >= RATE_MAX_PER_WINDOW) return false
  bucket.count += 1
  return true
}

function resolveProvider(): PlateLookupProvider {
  const token = (Deno.env.get('APIPLACAS_TOKEN') ?? '').trim()
  const explicit = (Deno.env.get('PLATE_PROVIDER') ?? '').toLowerCase().trim()
  const mode =
    explicit ||
    (token ? 'apiplacas' : 'mock')

  if (mode === 'apiplacas') {
    if (!token) {
      console.warn('[plate-lookup] PLATE_PROVIDER=apiplacas sem APIPLACAS_TOKEN — mock')
      return mockPlateProvider
    }
    return createApiPlacasPlateProvider({ token })
  }
  return mockPlateProvider
}

/** R3: garante sourceSnapshot mesmo em hit de cache legado. */
function attachSourceSnapshot(
  result: NormalizedPlateLookupResult,
): NormalizedPlateLookupResult {
  if (result.sourceSnapshot?.maker || result.sourceSnapshot?.plate) {
    return result
  }
  return {
    ...result,
    sourceSnapshot: {
      plate: result.plate ?? null,
      queriedAt: result.queriedAt ?? null,
      source: result.source ?? null,
      status: result.status ?? null,
      maker: result.maker ?? null,
      model: result.model ?? null,
      year: result.year != null ? String(result.year) : null,
      engine: result.engine ?? null,
      version: result.version ?? null,
      engineRaw: result.engineRaw ?? null,
      versionRaw: result.versionRaw ?? null,
      fuel: result.fuel ?? null,
      transmission: result.transmission ?? null,
      confidence: result.confidence ?? null,
    },
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  if (!checkRateLimit(clientKey(req))) {
    return json(429, {
      error: 'rate_limited',
      message: 'Muitas consultas. Aguarde um momento e tente novamente.',
    })
  }

  let body: { plate?: string }
  try {
    body = (await req.json()) as { plate?: string }
  } catch {
    return json(400, { error: 'invalid_json', message: 'Requisição inválida.' })
  }

  const plate = normalizePlate(body.plate ?? '')
  const provider = resolveProvider()

  if (!isValidPlate(plate)) {
    const result: NormalizedPlateLookupResult = {
      plate,
      status: 'invalid_plate',
      maker: null,
      model: null,
      year: null,
      version: null,
      engine: null,
      fuel: null,
      transmission: null,
      manufacturerId: null,
      modelId: null,
      versionId: null,
      vehicleGroup: null,
      source: provider.source,
      queriedAt: new Date().toISOString(),
      confidence: null,
      message: 'Formato inválido. Use placa antiga (ABC1234) ou Mercosul (ABC1D23).',
      candidates: [],
      isMock: provider.source === 'mock',
    }
    return json(200, result)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const sb =
    supabaseUrl && serviceKey
      ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
      : null

  if (sb) {
    const { data: cached } = await sb
      .from('cached_plates')
      .select('payload, expires_at, provider')
      .eq('plate', plate)
      .maybeSingle()
    const cacheProvider = String(cached?.provider ?? '').toLowerCase()
    const activeProvider = provider.source
    const payloadPreview = cached?.payload as Record<string, unknown> | undefined
    const payloadSource = String(payloadPreview?.source ?? cacheProvider).toLowerCase()
    // Não reutilizar cache de outro provedor (ex.: mock → apiplacas).
    const cacheUsable =
      Boolean(cached?.payload) &&
      Boolean(cached?.expires_at) &&
      new Date(String(cached!.expires_at)).getTime() > Date.now() &&
      cacheProvider === activeProvider &&
      payloadSource !== 'mock'
    if (cacheUsable && payloadPreview) {
      const payload = payloadPreview
      const cacheOk =
        payload.status === 'found' ||
        payload.status === 'incomplete' ||
        payload.status === 'not_in_catalog'
      // Read-only: enriquece modelo composto + SELECT IDs se VV já existir (nunca INSERT).
      if (cacheOk && payload.maker && payload.model) {
        try {
          const enriched = enrichFromCompositeModelo({
            maker: String(payload.maker),
            model: String(payload.model),
            year: payload.year as string | null,
            engine: (payload.engine as string | null) ?? null,
            version: (payload.version as string | null) ?? null,
          })
          const resolved = await resolveVehicleAgainstCatalog(sb, {
            maker: enriched.maker,
            model: enriched.model,
            year: enriched.year != null ? String(enriched.year) : null,
            engine: enriched.engine,
            version: enriched.version,
            status: String(payload.status ?? 'found') as NormalizedPlateLookupResult['status'],
            message: (payload.message as string | null) ?? null,
            confidence: (payload.confidence as number | null) ?? null,
            fuel: (payload.fuel as string | null) ?? null,
            transmission: (payload.transmission as string | null) ?? null,
            vehicleGroup: (payload.vehicleGroup as string | null) ?? null,
          })
          const statusOut = resolved.notInCatalog
            ? 'not_in_catalog'
            : ((payload.status as NormalizedPlateLookupResult['status']) ?? 'incomplete')
          const refreshed = attachSourceSnapshot({
            ...(payload as unknown as NormalizedPlateLookupResult),
            maker: resolved.makerName ?? enriched.maker,
            model: resolved.modelName ?? enriched.model,
            year:
              resolved.catalogYear ??
              (enriched.year != null ? String(enriched.year) : null) ??
              (payload.year as string | null) ??
              null,
            engine: resolved.catalogEngine ?? enriched.engine,
            version: resolved.catalogVersion ?? enriched.version,
            manufacturerId: resolved.manufacturerId,
            modelId: resolved.modelId,
            versionId: resolved.versionId,
            status: statusOut === 'found' ? 'found' : statusOut,
            queriedAt: new Date().toISOString(),
            sourceSnapshot: null,
          })
          return json(200, refreshed)
        } catch (err) {
          console.error('[plate-lookup] cache resolve error', err)
        }
      }
      return json(
        200,
        attachSourceSnapshot(payload as unknown as NormalizedPlateLookupResult),
      )
    }
  }

  const raw = await provider.lookupByPlate(plate)

  let manufacturerId: string | null = null
  let modelId: string | null = null
  let versionId: string | null = null
  let status = raw.status
  let makerOut = raw.maker
  let modelOut = raw.model
  let yearOut = raw.year
  let engineOut = raw.engine
  let versionOut = raw.version
  let confidenceBandOut: 'A' | 'B' | 'C' | 'D' | null = null

  if (sb && (raw.status === 'found' || raw.status === 'incomplete') && raw.maker && raw.model) {
    try {
      const enriched = enrichFromCompositeModelo({
        maker: raw.maker,
        model: raw.model,
        year: raw.year,
        engine: raw.engine,
        version: raw.version,
      })

      const invOn = isInvResolverEnabled()
      const invAliases = invOn ? await loadVehicleAliases(sb) : undefined
      const inv = invOn
        ? resolveVehicleIdentity({
            source: 'plate',
            aliases: invAliases,
            raw: [raw.maker, raw.model, raw.year, raw.engine, raw.version]
              .filter(Boolean)
              .join(' '),
            maker: enriched.maker,
            model: enriched.model,
            year: enriched.year != null ? String(enriched.year) : null,
            engine: enriched.engine,
            version: enriched.version,
          })
        : null

      if (inv) {
        makerOut = inv.filter.maker ?? enriched.maker
        modelOut = inv.filter.model ?? enriched.model
        yearOut = inv.filter.year ?? (enriched.year != null ? String(enriched.year) : raw.year)
        engineOut =
          inv.filter.engine === ''
            ? null
            : (inv.filter.engine ?? enriched.engine)
        versionOut =
          inv.filter.version === ''
            ? null
            : (inv.filter.version ?? enriched.version)
        confidenceBandOut = inv.confidenceBand
        raw.message = inv.message
        if (inv.status === 'not_in_catalog') status = 'not_in_catalog'
        else if (
          inv.status === 'pending_validation' ||
          inv.status === 'incomplete' ||
          inv.status === 'ambiguous'
        ) {
          status = inv.status === 'ambiguous' ? 'ambiguous' : 'incomplete'
        } else {
          status = inv.confidenceBand === 'A' ? 'found' : 'incomplete'
        }
        // Telemetria best-effort (sem placa)
        try {
          await sb.from('vehicle_resolution_events').insert({
            source: 'plate',
            status: inv.status,
            confidence_band: inv.confidenceBand,
            rule_ids: inv.evidence.map((e) => e.ruleId),
            input_hash: plate.slice(0, 3) + '***',
            maker: makerOut,
            model: modelOut,
            year: yearOut,
            engine: engineOut,
            version: versionOut,
          })
        } catch (telErr) {
          console.error('[plate-lookup] inv telemetry', telErr)
        }
      }

      // Lookup read-only: SELECT no mestre; escrita só em vehicle-confirm-upsert.
      const resolved = await resolveVehicleAgainstCatalog(sb, {
        ...raw,
        maker: makerOut,
        model: modelOut,
        year: yearOut,
        engine: engineOut,
        version: versionOut,
      })
      manufacturerId = resolved.manufacturerId
      modelId = resolved.modelId
      versionId = resolved.versionId
      if (resolved.makerName) makerOut = resolved.makerName
      if (resolved.modelName) modelOut = resolved.modelName
      if (resolved.catalogYear) yearOut = resolved.catalogYear
      if (resolved.catalogEngine) engineOut = resolved.catalogEngine
      if (resolved.catalogVersion) versionOut = resolved.catalogVersion
      if (resolved.notInCatalog) {
        status = 'not_in_catalog'
        raw.message =
          raw.message ??
          'Veículo identificado, mas não localizado no cadastro da FAL. Confira e ajuste montadora/modelo.'
      } else if (!inv && !engineOut && !versionOut) {
        raw.message =
          raw.message ??
          'Veículo identificado. Motor/versão não informados pela consulta — confira antes de buscar.'
      }
    } catch (resolveErr) {
      console.error('[plate-lookup] catalog resolve error', resolveErr)
    }
  }

  if (raw.status === 'not_in_catalog') status = 'not_in_catalog'

  const queriedAt = new Date().toISOString()
  const yearModelOut = raw.yearModel ?? yearOut
  const yearFabOut = raw.yearFabrication ?? null
  const result: NormalizedPlateLookupResult = {
    plate,
    status,
    maker: makerOut,
    model: modelOut,
    year: yearOut,
    yearModel: yearModelOut != null ? String(yearModelOut) : null,
    yearFabrication: yearFabOut != null ? String(yearFabOut) : null,
    version: versionOut,
    engine: engineOut,
    engineRaw: raw.engineRaw ?? null,
    versionRaw: raw.versionRaw ?? null,
    fuel: raw.fuel,
    transmission: raw.transmission,
    manufacturerId,
    modelId,
    versionId,
    vehicleGroup: raw.vehicleGroup,
    source: provider.source,
    queriedAt,
    confidence: raw.confidence,
    confidenceBand: confidenceBandOut,
    message: raw.message,
    candidates: raw.candidates ?? [],
    isMock: provider.source === 'mock',
    sourceSnapshot: {
      plate,
      queriedAt,
      source: provider.source,
      status,
      maker: makerOut,
      model: modelOut,
      year: yearOut != null ? String(yearOut) : null,
      yearModel: yearModelOut != null ? String(yearModelOut) : null,
      yearFabrication: yearFabOut != null ? String(yearFabOut) : null,
      engine: engineOut,
      version: versionOut,
      engineRaw: raw.engineRaw ?? null,
      versionRaw: raw.versionRaw ?? null,
      fuel: raw.fuel,
      transmission: raw.transmission,
      confidence: raw.confidence,
    },
  }

  if (sb) {
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString()
    await sb.from('cached_plates').upsert(
      {
        plate,
        provider: provider.source,
        status: result.status,
        payload: result,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'plate' },
    )
  }

  return json(200, attachSourceSnapshot(result))
})
