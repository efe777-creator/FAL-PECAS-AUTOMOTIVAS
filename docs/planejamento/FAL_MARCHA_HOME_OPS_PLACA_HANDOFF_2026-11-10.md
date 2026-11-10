# FAL — Handoff ops: busca por placa (Evo 1)

**Data:** 2026-11-10  
**AJUSTE:** 028  
**Status:** código no repo; **aplicar / publicar = gate humano**  
**Spec:** [FAL_SPEC_BUSCA_POR_PLACA_2026-11-09.md](./FAL_SPEC_BUSCA_POR_PLACA_2026-11-09.md)  
**VAL:** [FAL_MARCHA_BUSCA_POR_PLACA_EVO1_VAL_2026-11-10.md](./FAL_MARCHA_BUSCA_POR_PLACA_EVO1_VAL_2026-11-10.md)

---

## 1. Objetivo

Ligar na loja a Evolução 1 já implementada: Edge `plate-lookup`, cache `cached_plates`, UI Home/catálogo/`/veiculo`, fallback manual e pergunta de garagem.

---

## 2. Checklist operacional (ordem)

| # | Ação | Quem | Evidência |
|---|------|------|-----------|
| 1 | Aplicar migration `fal-pecas/supabase/migrations/20261110120000_plate_lookup_cache.sql` no projeto Supabase de produção (e staging, se houver) | eFe / ops | Tabela `cached_plates` existe; RLS só `service_role` |
| 1b | Aplicar também `20261110140000_store_home_vigencia_featured_limit.sql` (Home Onda 1: vigência + settings) | eFe / ops | Colunas `starts_at`/`ends_at`/`image_src_mobile`; tabela `store_home_settings` |
| 2 | Deploy da Edge Function `plate-lookup` (inclui `_shared` mock + apiPlacas + `vehicleResolver`) | eFe / ops | Function listada no dashboard; POST responde |
| 3 | Secrets da function (não no frontend) | eFe | Ver §3 |
| 4 | Smoke VAL: placas mock / clusters VW Gol e Chevrolet Onix | eFe | Checklist `FAL_VAL_BUSCA_POR_PLACA_EVO1_2026-11-10.md` |
| 5 | Publish Netlify com o build que contém `VehiclePlateSearch` na Home | eFe | Home pública mostra `#veiculo` |
| 6 | (Opcional Evo 2–3) `PLATE_PROVIDER=apiplacas` + token real | Comercial + eFe | Cobertura/custo validados |

---

## 3. Secrets (Edge apenas)

Documentados em `fal-pecas/.env.example` (comentário operacional):

| Secret | Uso |
|--------|-----|
| `PLATE_PROVIDER` | `mock` (default seguro) ou `apiplacas` |
| `APIPLACAS_TOKEN` | Token do provedor (só com `apiplacas`) |
| `APIPLACAS_BASE_URL` | Base URL se diferente do default do adapter |

**Regra:** nenhum `VITE_*` de placa no cliente.

Comandos de referência (ajustar projeto/ref):

```bash
# No diretório fal-pecas, com CLI logada no projeto certo:
npx supabase db push
# ou aplicar o SQL da migration no SQL Editor

npx supabase functions deploy plate-lookup

npx supabase secrets set PLATE_PROVIDER=mock
# Quando homologar provedor real:
# npx supabase secrets set PLATE_PROVIDER=apiplacas APIPLACAS_TOKEN=...
```

---

## 4. Smoke mínimo pós-deploy

1. Home → digitar placa inválida → mensagem de validação, sem travar.  
2. Placa mock conhecida (dev/mock) → confirmação → catálogo com `maker`/`model`/… na URL.  
3. Forçar falha (ou `unavailable`) → seleção manual imediata.  
4. Confirmar veículo → pergunta “salvar na garagem?” → Sim exige login se anônimo.  
5. Catálogo com bloco compacto de placa aplica filtros via callback + garagem.

---

## 5. Limitações conscientes

- Sem secrets/deploy, produção retorna `unavailable` e abre manual (comportamento esperado).  
- Provedor comercial real = Evo 2–3 (custo, LGPD, contrato).  
- Este handoff **não** autoriza cutover MP nem D-FRETE C.

---

## 6. Arquivos âncora

- Edge: `fal-pecas/supabase/functions/plate-lookup/`  
- Migration cache: `fal-pecas/supabase/migrations/20261110120000_plate_lookup_cache.sql`  
- UI: `fal-pecas/src/components/vehicle/VehiclePlateSearch.tsx`  
- Client: `fal-pecas/src/services/plates/`  
