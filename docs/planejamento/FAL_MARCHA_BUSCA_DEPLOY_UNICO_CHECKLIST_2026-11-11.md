# Checklist — deploy único (busca + IA)

**Quando eFe autorizar UM deploy Netlify.** Sem deploy parcial.

## Já pronto (não precisa no build)

| Item | Status |
|------|--------|
| `GROQ_API_KEY` no wtbp | OK |
| `GROQ_MODEL=openai/gpt-oss-20b` | OK |
| Edge `interpret-search-nl` (Groq) | OK em prod |
| `PLATE_PROVIDER=apiplacas` + token | OK |
| VAL IA + busca | `FAL_MARCHA_BUSCA_IA_GROQ_VAL_2026-11-11.md` |

## No deploy único (Netlify)

1. Set env **production**: `VITE_SEARCH_NL_LLM=1`
2. Build a partir do tip atual (`main`)
3. Confirmar `_redirects` / `netlify.toml` SPA (`/* → index.html`)
4. Smoke pós-publish:
   - `/catalogo?q=HB20%202015` → 3 SKUs · label `12/...`
   - busca NL: `preciso de um pivo para o palio 2010` → PVI1032
   - placa FRW0E37 (ou placa real) → HB20 filtros
   - `HB20 One 2015` → banner clarificação versão (sem filtrar One)

## Opcional no mesmo ciclo

- `npx supabase functions deploy interpret-search-nl` (só se tip local do Edge divergir do prod; secret `GROQ_MODEL` já cobre o modelo)

## Assinatura

Checklist deploy único · 2026-11-11
