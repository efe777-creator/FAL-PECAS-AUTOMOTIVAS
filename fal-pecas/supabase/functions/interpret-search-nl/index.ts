/**
 * FAL — interpret-search-nl (P2)
 *
 * Interpreta linguagem natural → SearchIntent parcial.
 * Provedor: Groq (grátis) via GROQ_API_KEY; sem key → intent=null (cliente usa determinístico).
 * Nunca inventa PVC / preço / estoque.
 *
 * Secrets: GROQ_API_KEY (opcional) · GROQ_MODEL (opcional, default openai/gpt-oss-20b)
 * Front: VITE_SEARCH_NL_LLM=1
 */
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type IntentPartial = {
  productQuery?: string | null
  vehicle?: {
    maker?: string
    model?: string
    year?: string
    engine?: string
    version?: string
  }
  codeHint?: string
  needsClarification?: boolean
  clarification?: 'engine' | 'version' | 'year' | 'model'
  confidence?: 'high' | 'medium' | 'low'
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const SYSTEM = `Você extrai intenção de busca de autopeças no Brasil.
Responda APENAS JSON válido (sem markdown) no formato:
{"productQuery":string|null,"vehicle":{"maker"?:string,"model"?:string,"year"?:string,"engine"?:string,"version"?:string},"codeHint"?:string,"needsClarification":boolean,"clarification"?: "engine"|"version"|"year"|"model","confidence":"high"|"medium"|"low"}

Regras:
- productQuery = só termos de peça/marca de peça (ex.: terminal, pivô, óleo). Sem modelo/ano.
- vehicle = montadora/modelo/ano/motor/versão se mencionados.
- codeHint = SKU/referência alfanumérica se parecer código de peça.
- NÃO invente compatibilidade, preço, estoque ou dados que não estejam no texto.
- Se ambíguo, needsClarification=true e clarification apropriado; confidence baixa/média.
- Anos: 2 ou 4 dígitos (2015 ou 15 → "2015").
- Motor: normalize "1.0", "1.6", etc.`

function sanitizeIntent(raw: unknown): IntentPartial | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const vehicleIn = (o.vehicle ?? {}) as Record<string, unknown>
  const vehicle: IntentPartial['vehicle'] = {}
  for (const k of ['maker', 'model', 'year', 'engine', 'version'] as const) {
    const v = vehicleIn[k]
    if (typeof v === 'string' && v.trim()) vehicle[k] = v.trim()
  }
  let year = vehicle.year
  if (year && /^\d{2}$/.test(year)) {
    const n = Number(year)
    vehicle.year = String(n >= 50 ? 1900 + n : 2000 + n)
  }
  const conf = o.confidence
  const clarification = o.clarification
  const out: IntentPartial = {
    productQuery:
      o.productQuery === null
        ? null
        : typeof o.productQuery === 'string'
          ? o.productQuery.trim() || null
          : undefined,
    vehicle: Object.keys(vehicle).length ? vehicle : undefined,
    codeHint: typeof o.codeHint === 'string' && o.codeHint.trim() ? o.codeHint.trim() : undefined,
    needsClarification: Boolean(o.needsClarification),
    clarification:
      clarification === 'engine' ||
      clarification === 'version' ||
      clarification === 'year' ||
      clarification === 'model'
        ? clarification
        : undefined,
    confidence: conf === 'high' || conf === 'medium' || conf === 'low' ? conf : 'medium',
  }
  return out
}

async function callGroq(q: string, apiKey: string, model: string): Promise<IntentPartial | null> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: q.slice(0, 240) },
      ],
    }),
  })
  if (!res.ok) {
    console.error('[interpret-search-nl] groq http', res.status, await res.text())
    return null
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content ?? ''
  try {
    return sanitizeIntent(JSON.parse(content))
  } catch {
    console.error('[interpret-search-nl] groq json parse fail', content.slice(0, 200))
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { q?: string }
    const q = String(body.q ?? '').trim()
    if (!q) {
      return json(200, { ok: true, mode: 'empty', intent: null })
    }

    const groqKey = (Deno.env.get('GROQ_API_KEY') ?? '').trim()
    const model =
      (Deno.env.get('GROQ_MODEL') ?? '').trim() || 'openai/gpt-oss-20b'

    if (!groqKey) {
      return json(200, {
        ok: true,
        mode: 'deterministic_required',
        message: 'GROQ_API_KEY ausente. Cliente deve usar interpretSearchQuery.',
        intent: null,
      })
    }

    const intent = await callGroq(q, groqKey, model)
    if (!intent) {
      return json(200, {
        ok: true,
        mode: 'llm_failed',
        message: 'LLM falhou; use determinístico.',
        intent: null,
      })
    }

    return json(200, {
      ok: true,
      mode: 'groq',
      model,
      intent,
    })
  } catch (e) {
    return json(500, { ok: false, error: String(e) })
  }
})
