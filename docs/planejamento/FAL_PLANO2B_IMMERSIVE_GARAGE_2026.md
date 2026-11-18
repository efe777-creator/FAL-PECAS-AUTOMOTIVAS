# FAL — PLANO 2B · Immersive Garage — Experiência visual do veículo

**Status:** **E1–E2 IMPLEMENTADAS na `dev`** (config 2D + preview peças FAL) — 3D/AR ainda fora  
**Data:** 2026-11-18  
**Branch de trabalho:** `dev`  
**Branch de produção:** `main` (não usar para desenvolvimento)  
**Natureza:** documento canônico + progresso de implementação (E1–E3: 2D + preview G7 + viewer 3D leve com fallback)  

**Pré-requisito obrigatório:** [PLANO 2A — Vehicle Identity](./FAL_PLANO2A_VEHICLE_IDENTITY_2026.md) (**APROVADO eFe · IMPLEMENTADO E1–E5 · §24**) · [VAL-plano2a](../../fal-pecas/docs/VAL-plano2a-vehicle-identity.md)  
**Contratos herdados:** PLANO 2A §19 (chave = `vehicle_identities.id`)  
**Direção:** [FAL_GARAGE_VISAO_FUNCIONAL.md](../futuro/FAL_GARAGE_VISAO_FUNCIONAL.md)

---

## 1. Objetivo e fora de escopo

### 1.1 Objetivo

Complementar a identidade permanente do veículo (2A) com uma **camada visual** (configuração de aparência, preview de peças, eventual 3D/immersive) **sem** criar segundo cadastro de veículo e **sem** misturar fato técnico com cosmético.

### 1.2 Fora de escopo do PLANO 2B (Etapa 0)

- Reabrir decisões D1–D11 / A1–A3 do 2A  
- Mutar histórico AUTHORIZED, ownership, G7 ou commerce por “salvar pintura”  
- ERP de oficinas / marketplace profissional  
- Deploy produção / `main`  
- Afirmar instalação real só porque o visual mostra peça montada  

### 1.3 Princípio central

| Camada | Dono | Exemplos |
|--------|------|----------|
| **Fato / técnico (2A)** | Events, evidence, commerce FAL, ownership | Compra, instalação declarada, km, NF |
| **Visual (2B)** | Config de aparência ligada à identity | Cor de carroceria no viewer, roda em preview, layout 3D |

**Visual ≠ fato.** Instalação 2A validada *pode* refletir no modelo; o inverso **nunca** cria evento 2A sozinho.

---

## 2. Contratos de integração (canônicos — herdados do 2A §19)

| Caso | 2A | 2B |
|------|----|----|
| Pintura no visualizador | Sem evento automático | Salva config visual |
| Compra rodas FAL | Evento compra + snapshot G6 | Preview visual opcional |
| Instalação | Evento 2A validado | Pode refletir “instalado” no modelo |
| Transferência | Governa privacidade | Configs **privadas** não seguem automaticamente |
| Chave | `vehicle_identities.id` | FK única; **sem** segundo cadastro |

Sem segunda infraestrutura de identidade. Sem clonar `customer_vehicles` como source of truth visual.

---

## 3. Modelo de dados proposto (não implementar nesta Etapa 0)

### 3.1 `vehicle_visual_configs` (**Proposto**)

- `vehicle_identity_id` (FK)  
- `owner_customer_id` / `ownership_period_id` (configs privadas do período)  
- `payload` jsonb (cor, rodas, calotas, adesivos, câmera, tema)  
- `visibility` alinhada ao vocabulário 2A (`private_owner` \| `period` \| `shared` \| `public_vehicle`)  
- `updated_at`, autor  

### 3.2 `vehicle_visual_presets` / assets (**Proposto**, tardio)

Catálogo de meshes/texturas versionados; **não** misturar com `vehicle_evidence`.

### 3.3 Ligação commerce

Preview pós-compra lê `origin_ref` / G7 map / product id — **não** inventa `bought`.

---

## 4. Experiência (rascunho)

1. Entrada: `/conta/veiculos/:membershipId?modulo=visual` (ou deep-link Immersive).  
2. Viewer leve primeiro (2D/config) → 3D progressivo.  
3. Mobile: performance budget; fallback 2D obrigatório.  
4. Tokens: design system FAL da loja — **não** copiar visual do Painel ADM.

---

## 5. Segurança e privacidade

- Config `private_owner` **não** migra na transferência sem opt-in (espelha 2A D5/A3).  
- Share 2A **não** concede editor visual por default.  
- URLs de assets: bucket privado + signed URL (honestidade de TTL como 2A).

---

## 6. Roadmap proposto (só após aprovação)

| Etapa | Escopo | Dependência |
|-------|--------|-------------|
| **0** | Este documento + aprovação eFe | 2A §24 PASS |
| **1** | Config visual 2D + persistência em identity | Etapa 0 |
| **2** | Preview de peça FAL no viewer (commerce read-only) | E1 + G6/G7 |
| **3** | Viewer 3D leve (progressive enhancement) | E1–E2 |
| **4** | Sync opcional “instalado 2A → refletir no modelo” | Events 2A |
| **5** | AR/experimentos — só com gate explícito | Não antecipar |

---

## 7. Checklist

- [x] eFe aprova via MARCHA  
- [x] Contratos §2 confirmados (sem segundo identity)  
- [x] Etapa 1 = config 2D (sem Three.js)  
- [x] Etapa 2 = preview peças FAL read-only (G7)  
- [x] Etapa 3 = viewer 3D leve (lazy Three + WebGL detect + fallback 2D)  
- [x] Branch `dev` apenas  
- [ ] Etapa 4+ (sync instalação → modelo / AR) — só com nova MARCHA  
- [ ] Deploy `main`  

**Não fazer:** gravar fato 2A a partir do viewer; alterar `main`; AR sem gate.

---

## 8. Confirmação Etapa 1–3

| Item | Valor |
|------|--------|
| Documento | `docs/planejamento/FAL_PLANO2B_IMMERSIVE_GARAGE_2026.md` |
| Branch | `dev` |
| E1 Migration | `20261118230000_plano2b_e1_vehicle_visual_configs.sql` |
| E2 Preview | `vehicleVisualPartPreview.ts` · lista G7 + imagens produto |
| E3 Viewer | `VehicleViewer3D.tsx` lazy · `canUseWebGL` · pref `auto/2d/3d` |
| UI | `?modulo=visual` · silhueta SVG + 3D procedural + cards peças |
| Three.js | **Sim** (lazy; fallback 2D se sem WebGL) |
| AR | **Não** |
| Próximo passo | MARCHA → Etapa 4 (sync opcional instalado 2A → modelo) |
