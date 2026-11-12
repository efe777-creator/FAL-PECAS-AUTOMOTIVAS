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
import { vehicleCanonicalUpsert } from '../_shared/vehicleCanonicalUpsert.ts'
import {
  normalizeVersionLabel,
  sanitizeEngine,
  splitApiModelo,
} from '../_shared/splitApiModelo.ts'

/** Corrige modelo composto em cache antigo / feeds que misturam motor+versão no modelo. */
function enrichFromCompositeModelo(input: {
  maker: string
  model: string
  year?: string | number | null
  engine?: string | null
  version?: string | null
}) {
  const split = splitApiModelo(input.model)
  const engine =
    sanitizeEngine(split.engine) ??
    sanitizeEngine(input.engine) ??
    null
  const version =
    normalizeVersionLabel(split.version ?? input.version) || null
  return {
    maker: input.maker,
    model: split.model ?? input.model,
    year: input.year ?? null,
    engine,
    version,
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
      // Sempre re-canonicaliza cache identificável (corrige payloads pré-upsert / status velho).
      if (cacheOk && payload.maker && payload.model) {
        try {
          const enriched = enrichFromCompositeModelo({
            maker: String(payload.maker),
            model: String(payload.model),
            year: payload.year as string | null,
            engine: (payload.engine as string | null) ?? null,
            version: (payload.version as string | null) ?? null,
          })
          const upserted = await vehicleCanonicalUpsert(sb, {
            ...enriched,
            source: 'plate',
          })
          const missingMv = !upserted.engine && !upserted.version
          const refreshed = {
            ...payload,
            maker: upserted.maker,
            model: upserted.model,
            year: upserted.year ?? payload.year ?? null,
            engine: upserted.engine,
            version: upserted.version,
            manufacturerId: upserted.manufacturerId,
            modelId: upserted.modelId,
            versionId: upserted.versionId,
            // Com VV canônico, filtros podem preencher — não trava como incomplete por ano/PVC.
            status: 'found',
            message: missingMv
              ? 'Veículo identificado. Motor/versão não informados pela consulta — confira antes de buscar.'
              : null,
            queriedAt: new Date().toISOString(),
          }
          await sb.from('cached_plates').upsert(
            {
              plate,
              provider: activeProvider,
              status: 'found',
              payload: refreshed,
              expires_at: cached!.expires_at,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'plate' },
          )
          return json(200, refreshed)
        } catch (err) {
          console.error('[plate-lookup] cache re-upsert error', err)
        }
      }
      return json(200, payload)
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

  if (sb && (raw.status === 'found' || raw.status === 'incomplete') && raw.maker && raw.model) {
    try {
      // Upsert canônico: garante VV com os 5 campos e nomes oficiais FAL.
      const enriched = enrichFromCompositeModelo({
        maker: raw.maker,
        model: raw.model,
        year: raw.year,
        engine: raw.engine,
        version: raw.version,
      })
      const upserted = await vehicleCanonicalUpsert(sb, {
        ...enriched,
        source: 'plate',
      })
      manufacturerId = upserted.manufacturerId
      modelId = upserted.modelId
      versionId = upserted.versionId
      makerOut = upserted.maker
      modelOut = upserted.model
      yearOut = upserted.year ?? raw.year
      engineOut = upserted.engine
      versionOut = upserted.version
      // VV canônico existe → UI preenche 5 filtros; incomplete só se API veio sem maker/model.
      status = 'found'
      if (!upserted.engine && !upserted.version) {
        raw.message =
          'Veículo identificado. Motor/versão não informados pela consulta — confira antes de buscar.'
      } else {
        raw.message = null
      }
    } catch (upsertErr) {
      console.error('[plate-lookup] canonical upsert error', upsertErr)
      // Fallback: resolve só leitura (sem criar)
      try {
        const resolved = await resolveVehicleAgainstCatalog(sb, raw)
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
        }
      } catch (err) {
        console.error('[plate-lookup] resolver error', err)
      }
    }
  }

  if (raw.status === 'not_in_catalog') status = 'not_in_catalog'

  const result: NormalizedPlateLookupResult = {
    plate,
    status,
    maker: makerOut,
    model: modelOut,
    year: yearOut,
    version: versionOut,
    engine: engineOut,
    fuel: raw.fuel,
    transmission: raw.transmission,
    manufacturerId,
    modelId,
    versionId,
    vehicleGroup: raw.vehicleGroup,
    source: provider.source,
    queriedAt: new Date().toISOString(),
    confidence: raw.confidence,
    message: raw.message,
    candidates: raw.candidates ?? [],
    isMock: provider.source === 'mock',
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

  return json(200, result)
})
