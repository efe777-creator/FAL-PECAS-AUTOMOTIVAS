# VERIFICAÇÃO — Busca Inteligente P0 · o que está certo / feito / faltando

**Data:** 2026-11-11 13:16–13:17 (UTC-3)  
**Auth:** eFe — `MARCHA VERIFICAR… TESTE A BUSCA… APENAS OS COMMITS`  
**Prod Supabase (site):** `wtbpwuiayednvlhvuhbh`  
**Tip local = origin/main no momento da verificação:** `92457fb`  
**Regra desta rodada:** só **commit** local do relatório — **sem push / sem deploy**.

---

## 1. Evidência fresca (nesta sessão)

| Camada | Comando / URL | Resultado |
|--------|---------------|-----------|
| Vitest | `interpretSearchQuery` + `buildCatalogSearchParams` | **8/8 PASS** |
| SQL YMM | `search_products(… HYUNDAI, HB20, 2015)` | **3** BRD2109, TDI2116, TDI2117 |
| SQL código | `q=TDI2116` | **1** TDI2116 |
| SQL peça+YMM | `q=terminal` + YMM 2015 | **2** TDI2116/TDI2117 |
| PVC | BRD/TDI × HB20 | `year_start=2012`, `year_end=null` → **2015 ∈ intervalo** |
| Site texto | `/catalogo?q=HB20%202015` | URL → `?maker=Hyundai&model=HB20&year=2015` · **3 produtos** · preços OK |
| Site peça+YMM | `/catalogo?q=terminal%20HB20%202015` | URL → `?q=terminal&maker=Hyundai&model=HB20&year=2015` · **2 produtos** |

---

## 2. O que fizemos (entregue)

| Item | Onde |
|------|------|
| Interpretador determinístico YMM+peça+código | `interpretSearchQuery.ts` + testes |
| Intent → URL / params catálogo | `buildCatalogSearchParams.ts`, SearchBar, CatalogPage |
| Defesa: limpar `q` bruto após interpretar | `searchService.ts` |
| Catálogo veículos para match sem filtro nested quebrado | `vehicleService.listVehicleCatalogEntries` |
| Deep-link `?q=` → URL canônica | CatalogPage `useEffect` |
| Autocomplete VEÍCULOS\|PEÇAS + copy | Onda 3 (código + VAL) |
| RPC year-range + wildcard + commercial_ref | **wtbp** via `20261110160000` |
| Hotfix: não usar `customer_can_see_product` no compat | migration `20261111140000` ajustada |
| VALs / smoke docs | `FAL_MARCHA_BUSCA_*_VAL_2026-11-11.md` |

**Commits principais:** `2f96506` → `e02b01b` → `92457fb` (já estavam em `origin/main` nesta verificação).

---

## 3. O que está certo (P0 aceite)

- Texto `HB20 2015` = seletor YMM (mesmos 3 SKUs).
- `terminal HB20 2015` filtra só terminais (2), sem axial.
- Código `TDI2116` resolve 1 SKU.
- Compatibilidade só via PVC (`year_start/end`).
- Preços BRD/TDI aparecem resolvidos no site (R$ 61,45 / R$ 74,07).
- Projeto prod do Netlify é **wtbp**, não o ref do MCP `owllmfcp…`.

---

## 4. O que ainda falta (fora do “P0 crítico” ou polish)

| Prioridade | Falta | Gate |
|------------|-------|------|
| P0 polish | Empty state distinto “veículo reconhecido sem peças” (Task 5 do plano P0) | código |
| P1 | Autocomplete seccionado fino / mais casos UI | plano P1 |
| P1 | Label período `12/...` → `2012–atual` | UX eFe |
| P1 | search_prep / sinônimos aplicados de ponta a ponta no wtbp | OK eFe |
| P1 | Matriz homologação completa (placa/garagem smoke revalidar) | ops |
| P2 | IA / Edge LLM | orçamento eFe |
| Ops | Monitor zero-result contínuo | ops |
| Ops | Drift migrations locais vs wtbp (várias pending no `migration list`) | apply seletivo |
| Doc | Plano P0 checkboxes ainda `- [ ]` no markdown (código já feito) | doc sync |

**Não inventar** preço/BRD/IA sem OK — mantido.

---

## 5. Git / publish nesta rodada

| Ação | Status |
|------|--------|
| Push | **NÃO** (pedido eFe) |
| Deploy Netlify | **NÃO** (pedido eFe) |
| Commit deste relatório | **SIM** (local) |

Quando eFe mandar: `push` + deploy.

## Assinatura

VERIFICAÇÃO busca P0 · wtbp · 2026-11-11 · sem push/deploy
