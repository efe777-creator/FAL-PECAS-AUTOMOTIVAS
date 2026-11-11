/**
 * FAL — interpret-search-nl (P2 · pronta, desligada por padrão)
 *
 * Contrato: recebe { q } e devolve intent=null → cliente usa interpretSearchQuery.
 * Provedor grátis (Groq/Gemini) entra depois do refine da busca.
 * Nunca inventa PVC / preço / estoque.
 *
 * Deploy: supabase functions deploy interpret-search-nl
 * Ligar no front: VITE_SEARCH_NL_LLM=1
 */
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { q?: string }
    const q = String(body.q ?? '').trim()

    return new Response(
      JSON.stringify({
        ok: true,
        mode: 'deterministic_required',
        message:
          'LLM ainda não ligado. Cliente deve usar interpretSearchQuery. q: ' +
          (q ? q.slice(0, 80) : ''),
        intent: null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
