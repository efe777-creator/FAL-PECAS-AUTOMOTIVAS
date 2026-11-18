# FAL — PLANO 2B · Fase B — 3D Asset Visualization (Camada 2)

**Status:** **E0–E4 na `dev`** (doc + Engine + assets + loader + ADM). E5 performance. **Sem** AR / `main`.  
**Data:** 2026-11-18  
**Branch:** `dev`  
**Auth:** MARCHA eFe pós Fase A (Camada 1 consolidada)  
**Pai:** [FAL_PLANO2B_IMMERSIVE_GARAGE_2026.md](./FAL_PLANO2B_IMMERSIVE_GARAGE_2026.md)  
**Pré-requisito:** Camada 1 E0–E4 + Fase A código/contrato PASS · Visual ≠ fato

---

## 1. Objetivo

Entregar a **Camada 2**: biblioteca de ativos 3D realistas (GLB/glTF), associação tipada ao veículo, viewer adaptativo e gestão ADM — **sem** confundir com o viewer procedural da Camada 1 e **sem** criar fato 2A a partir do visual.

### 1.1 Fora de escopo (esta fase)

- AR / WebXR (Fase C)  
- Geração automática de modelos por IA em produção (só se MARCHA futura + licença)  
- Alterar regras 2A / G7 / ownership  
- Merge `main` / deploy sem auth  
- Substituir Camada 1: procedural e 2D permanecem como adapters de fallback

---

## 2. Contratos herdados (não negociáveis)

1. Visual ≠ fato.  
2. Sync 2A→visual continua opt-in; sem write-back.  
3. Prefs `private_owner` não herdam na transferência.  
4. Share ≠ edit visual.  
5. UI (Garagem/ADM) **não** escolhe tecnologia de render — o **Visualization Engine** decide.  
6. 3D não é obrigatório para jornadas FAL.

---

## 3. Visualization Engine (contrato)

| Source | Adapter | Disponibilidade |
|--------|---------|-----------------|
| `2d` | SVG / imagem | Sempre |
| `procedural` | Three procedural (E3 Camada 1) | WebGL + pref 3d/auto |
| `glb` | Loader glTF/GLB aprovado | Fase B E2+ · asset aprovado |
| `xr` | WebXR | Fase C + gate |

**Regra de resolução (E1):**  
`2d` se pref 2d ou sem WebGL → senão `glb` se houver asset aprovado → senão `procedural` se WebGL → senão `2d`.  
`xr` só com flag explícita (default off).

---

## 4. Modelo de dados proposto (implementar em E2+)

### 4.1 `vehicle_visual_assets` (**Implementado · E2**)

Migration: `20261118240000_plano2b_fase_b_e2_visual_assets.sql`  
RPC: `find_approved_visual_asset_for_identity`  
Bucket: `vehicle-visual-assets` (privado; staff write; select staff ou asset `approved`)

### 4.2 `vehicle_visual_asset_compat` (**Implementado · E2**)

Estados `pending|approved|rejected|revoked`; revoke sem delete.

### 4.3 Segurança de arquivo (upload ADM)

Bucket 50MB · MIME glTF/GLB · staff-only insert. Validação estrutural profunda = E4 ADM.

---

## 5. Roadmap Fase B

| Etapa | Escopo | Status |
|-------|--------|--------|
| **B0** | Este documento + MARCHA | Feito |
| **B1** | Contrato Engine + resolução source + wire UI (2d/procedural) | Feito |
| **B2** | Tabelas assets/compat + RLS + storage privado | Feito |
| **B3** | Loader GLB lazy + materials básicos + fallback | Feito |
| **B4** | ADM biblioteca + aprovação + procedência | Feito (`/admin/modelos-3d`) |
| **B5** | Baseline performance + a11y + observabilidade mínima | Pendente |

---

## 6. Critérios de aceite B1

- [x] Função pura `resolveVisualizationSource` com testes  
- [x] UI Garagem usa Engine (não escolhe Three direto)  
- [x] Sem import GLB / sem XR  
- [x] Label honesto: procedural ≠ modelo realista  
- [x] B2 tabelas + RLS + storage + wire `hasApprovedGlb`  
- [x] B3 loader GLB lazy (`VehicleGlbViewer` + signed URL + fallback procedural)  
- [x] B4 ADM `/admin/modelos-3d` (upload draft, aprovar/rejeitar/revogar, compat, procedência)  

---

## 7. Proibições (E2)

- Não carregar GLB de URL arbitrária (loader = E3)  
- Não inventar associação sem linha compat aprovada  
- Não alterar Camada 1 contracts  
- Não `main` / deploy / AR
