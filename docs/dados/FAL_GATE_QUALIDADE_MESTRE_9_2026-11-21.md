# Gates objetivos — qualidade mestre veicular (meta 9/10)

**Projeto:** wtbp · **Data VAL:** 2026-11-21  
**Invariante validada:** Corolla e Corolla Cross são modelos distintos (ambos `verified` ativos; busca não colapsa).

| # | Gate | Resultado | Evidência |
|---|------|-----------|-----------|
| 1 | 100% modelos classificados com evidência/review | PASS | `quality_status` em todos; CSV registro canônico |
| 2 | Públicos = só `verified`; zero review/quarantined na loja | PASS | App + RLS `models_public_read`/`vehicle_versions_public_read` + VV join verified; 126 públicos |
| 3 | Zero verified ativo com trim/config/motor no nome | PASS | SQL `polluted_active=0` pós-remap |
| 4 | Zero plate-only ativo sem revisão; zero VV ativo em model inativo | PASS | plate-only→review/superseded; `vv_orphan=0` |
| 5 | Zero duplicata normalizada maker/model; zero colisão natural VV no remap | PASS | remaps com merge de conflito natural-key |
| 6 | Writers na fronteira; sem fallback insert client; apps-import não cria verified | PASS | `vehicleCanonicalUpsert` fail-closed; apps-import `review`; promoção só `set_model_quality_status` |
| 7 | Busca `corolla cross` → Corolla Cross; ausência do filho não retorna Corolla | PASS | `interpretSearchQuery` + testes matriz |
| 8 | Matriz pai/filho/trim (Cross Fox, T-Cross, New Fiesta, HR-V, Hilux, Sentra) | PASS | vitest normalize + search + reconcile |
| 9 | Remap preserva PVC/garagem; IDs auditáveis via superseded | PASS | `canonical_model_id` + customer/VV move |
| 10 | Testes alvo + smoke SQL | PASS parcial | vitest 77/77 nos pacotes DQ; tsc com erros pré-existentes fora do escopo |
| 11 | verified com A1 (OEM URL) — nenhum só fipeX/LLM/placa | PASS | `evidence_kind=oem_a1` + URLs marca/linha |
| 12 | Snapshots externos com checksum | PASS parcial | Contrato código (`isGate12FormalSnapshot` + checksum obrigatório senatran/pbev); fipeX = B; download datado SENATRAN/PBEV ainda ops |

## Contagens pós-apply (wtbp)

- verified / review / quarantined / superseded — ver SQL `group by quality_status`
- Toyota ativos: Corolla, Corolla Cross, Hilux, Etios, Yaris
- Superseded: Corolla Apremiumh, Hilux CD4X2 SR, HR-V EX Cvt, Sentra 20SV Cvt, trims poluídos, Saveira

## Nota

**Nota higiene/gates nome: 9/10 — módulo mestre fechado em higiene (2026-11-21).**  
**Riqueza cadastro (pós-marcha vida):** ~6–6,5/10 — Cross ainda 0 VV (sem thin-seed); anos Cross via vida 2021→agora; 242 VV sem engine.  
**Assertividade operacional:** ~8,5/10 — bug `end null` corrigido; RLS+resolver verified; telemetria INV com `catalog_total`/`version_id` pós-resolve.  
Gate 12 parcial (snapshots SENATRAN/PBEV) — residual ops.  
VAL fechamento: `docs/dados/FAL_MARCHA_FECHAMENTO_MESTRE_VEICULAR_VAL_2026-11-21.md`.
