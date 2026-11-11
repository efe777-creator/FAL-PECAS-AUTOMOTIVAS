# FAL_AUDITORIA_APLICACOES_COMPATIBILIDADE_V1

**Data:** 2026-11-11 · Somente leitura

---

## 1. Como a compatibilidade é determinada

**Fonte única pretendida:** `product_vehicle_compatibility` (PVC) ligada a `vehicle_versions`.

| Superfície | Mecanismo | FATO |
|------------|-----------|------|
| Catálogo / SearchBar (após seletor) | RPC `search_products` → CTE `vehicle_product_ids` | Sim |
| Listagens alternativas | `filterProductIdsByVehicle` (JS + PVC) | Sim |
| PDP / cards | Display only (`attachCompatibilitySummaries`) — **não** decide busca | Sim |
| Texto `q` | **Não consulta PVC** | Sim |

### Graus (classificação FAL)

| Grau | Definição operacional |
|------|----------------------|
| Confirmada | Linha PVC + VV active + produto published + período casa o ano |
| Incompleta | PVC sem motor/versão quando o mercado exige (ou motor no campo errado) |
| Não confirmada | Sem PVC; ou só texto livre em `notes` |
| Conflitante | Períodos/motores contraditórios para o mesmo SKU |
| Rejeitada | Fora do período / motor não casa |

---

## 2. Regras de período

**Repo (migration `…1160000`):** se PVC tem `year_start`/`year_end`, usa intervalo (null = aberto); senão `vv.year`.

**Produção (corpo atual da RPC):** **somente** `vv.year = p_year`.

**UI label:** `formatVehicleAppYear` → `12/...` quando `year_end` null (**design**, não truncamento de dado).

**Match aberto:** `yearMatchesVehicleApp` / SQL novo **não** cortam `year_end` null no “hoje”; seletor limita expansão ao ano civil.

---

## 3. Evidência HB20 (produção)

PVC TDI2116 / TDI2117:

| sku | maker | model | engine | version_name | year_start | year_end | vv.year |
|-----|-------|-------|--------|--------------|------------|----------|---------|
| TDI2116 | HYUNDAI | HB20 | null | 1.0 | 2012 | null | 2012 |
| TDI2116 | HYUNDAI | HB20 | null | 1.6 | 2012 | null | 2012 |
| TDI2117 | HYUNDAI | HB20 | null | 1.0 | 2012 | null | 2012 |
| TDI2117 | HYUNDAI | HB20 | null | 1.6 | 2012 | null | 2012 |

Consulta direta PVC ∩ ano 2015 ∩ published: **2** produtos.  
RPC `search_products` ano 2015: **0**.  
RPC ano 2012: **2**.

BRD2109: **sem produto** no banco atual.

---

## 4. Texto vs estruturado — perda de resultados

| Etapa | Onde perde |
|-------|------------|
| 1. Interpretação | SearchBar não gera maker/model/year | **FATO código** |
| 2. Documento | `search_document` sem apps/anos | **FATO repo** |
| 3. RPC texto | AND exige match de `2015` no produto | **FATO** |
| 4. RPC veículo (prod) | Ano compara `vv.year` não PVC range | **FATO SQL** |
| 5. Motor na UI | `engine=1.0` vs dado em `version_name` | **FATO dados** |

**Causa-raiz composta (comprovada):**
1. **P0-ARCH:** canais texto e PVC desunificados.  
2. **P0-DRIFT:** produção sem migration de year range/wildcard.  
3. **P0-DATA:** motor em `version_name`; VV.year pontual enganoso.

TinyFish (3 SKUs / 2015) **não** reproduz no SQL atual → registrar como evidência externa desatualizada ou ambiente divergente (**HIPÓTESE**).

---

## 5. Problemas

| ID | Descrição | P |
|----|-----------|---|
| APP-01 | Texto não usa PVC | P0 |
| APP-02 | RPC prod ignora year_start/end | P0 |
| APP-03 | Motor em version_name (HB20) | P0 |
| APP-04 | Display apps compact max 4 / titlecase Hb20 | P1 |
| APP-05 | notes textuais sem VV | P2 (classificar não confirmada) |

## 6. Preservar

Tabela PVC, unique (product, vv), check year_end≥start, import apps, wildcard planejado no repo, enrich de apps na UI.
