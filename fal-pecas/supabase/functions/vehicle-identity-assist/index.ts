/**
 * FAL — vehicle-identity-assist
 *
 * Sugere modelo / motor / versão / combustível / tração a partir do nome FIPE residual.
 * Provedor: Groq (GROQ_API_KEY). Sem key → mode deterministic_required (cliente usa regras locais).
 * Nunca grava no mestre — só JSON de sugestão.
 */
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Suggestion = {
  model?: string | null
  engine?: string | null
  version?: string | null
  fuel?: string | null
  traction?: string | null
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const SYSTEM = `Você classifica nomes de veículos brasileiros (FIPE/API) nos campos do mestre FAL.
Responda APENAS JSON válido (sem markdown):
{"model":string|null,"engine":string|null,"version":string|null,"fuel":string|null,"traction":string|null}

Contrato obrigatório:
- model = só a linha comercial (ex.: Tiggo 5X, HB20, Onix Plus, Tera). Sem cilindrada, válvulas, turbo ou acabamento.
- engine = cilindrada + válvulas + selo de torque + família (ex.: "1.0", "1.0 16V", "1.0 12V 170 TSI", "1.0 TSI", "2.0T", "T200").
- version = só acabamento por extenso (Highline, Comfort, Comfort Plus, Platinum, Essence, Working). Sem 8V/16V/Turbo e sem número de torque.
- fuel = Flex|Gasolina|Etanol|Diesel|GNV|Elétrico|Híbrido se evidência no texto; senão null.
- traction = 4x2|4x4|awd se evidência (4x4, AWD, 4x2); senão null. Não invente eixo.
- Não invente campos sem evidência no texto.
- Corrija o campo atual quando estiver abreviado ou no lugar errado. Não devolva a sigla.

Abreviações que devem sair por extenso:
- High = Highline (não existe versão High)
- Comf. / Com. / C. = Comfort; C.Plus = Comfort Plus; C.Style = Comfort Style
- Plat. = Platinum
- Essen. = Essence; Work. = Working; Adv. = Adventure; Celeb. = Celebration
- TB / TGDI = Turbo, no motor
- Die. = Diesel e Híb. = Híbrido, combustível, não versão
- CS = Cabine Simples, CE = Cabine Estendida, CD = Cabine Dupla
- High Country permanece High Country (não é Highline)
- 170, 200, 250 e 350 antes de TSI/TFSI = motor (ex.: "170 TSI"), nunca versão
- T200 e T270 = motor
- Mec. e Aut. = câmbio, não versão`

function sanitizeSuggestion(raw: unknown): Suggestion | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const out: Suggestion = {}
  for (const k of ['model', 'engine', 'version', 'fuel', 'traction'] as const) {
    const v = o[k]
    if (typeof v === 'string' && v.trim()) out[k] = v.trim()
    else if (v === null) out[k] = null
  }
  if (typeof out.traction === 'string') {
    const t = out.traction.toLowerCase()
    out.traction = t === '4x2' || t === '4x4' || t === 'awd' ? t : null
  }
  return Object.values(out).some((v) => v != null && String(v).trim()) ? out : null
}

async function callGroq(
  user: string,
  apiKey: string,
  model: string,
): Promise<Suggestion | null> {
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
        { role: 'user', content: user.slice(0, 480) },
      ],
    }),
  })
  if (!res.ok) {
    console.error('[vehicle-identity-assist] groq http', res.status, await res.text())
    return null
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content ?? ''
  try {
    return sanitizeSuggestion(JSON.parse(content))
  } catch {
    console.error('[vehicle-identity-assist] json parse fail', content.slice(0, 200))
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const rawName = String(body.rawName ?? '').trim()
    if (!rawName) {
      return json(200, { ok: true, mode: 'empty', suggestion: null })
    }

    const groqKey = (Deno.env.get('GROQ_API_KEY') ?? '').trim()
    const model =
      (Deno.env.get('GROQ_MODEL') ?? '').trim() || 'openai/gpt-oss-20b'

    if (!groqKey) {
      return json(200, {
        ok: true,
        mode: 'deterministic_required',
        message: 'GROQ_API_KEY ausente. Use as regras locais (splitApiModelo).',
        suggestion: null,
      })
    }

    const context = [
      `nome: ${rawName}`,
      body.maker ? `montadora: ${body.maker}` : '',
      body.model ? `modelo_atual: ${body.model}` : '',
      body.engine ? `motor_atual: ${body.engine}` : '',
      body.version ? `versao_atual: ${body.version}` : '',
      body.fuel ? `combustivel_atual: ${body.fuel}` : '',
      body.traction ? `tracao_atual: ${body.traction}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const suggestion = await callGroq(context, groqKey, model)
    if (!suggestion) {
      return json(200, {
        ok: true,
        mode: 'llm_failed',
        message: 'LLM falhou; mantenha as regras locais.',
        suggestion: null,
      })
    }

    return json(200, {
      ok: true,
      mode: 'groq',
      model,
      suggestion,
    })
  } catch (e) {
    return json(500, { ok: false, error: String(e) })
  }
})
