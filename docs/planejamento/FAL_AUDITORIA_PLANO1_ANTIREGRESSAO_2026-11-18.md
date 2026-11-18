# FAL — Auditoria PLANO 1 + medidas anti-regressão

**Data:** 2026-11-18  
**Fonte canônica:** `C:\Users\user\repos\FAL-PECAS-AUTOMOTIVAS` · branch `dev` @ `85d3574`  
**Plano:** [FAL_PLANO1_MINHA_GARAGEM…](./FAL_PLANO1_MINHA_GARAGEM_FUNDACAO_EXPERIENCIA_2026-11-18.md)  
**VAL:** [VAL-garagem-plano1.md](../../fal-pecas/docs/VAL-garagem-plano1.md)

---

## 1. Veredito

| Dimensão | Status |
|----------|--------|
| G0–G8 no código (`repos` / `dev`) | **PASS** — commits G1–G8 + smoke fix ativos |
| Suite Vitest pacote garagem | **PASS** — 8 files / 28 tests |
| Suite Vitest fundação PLANO 0 | **PASS** — 4 files / 19 tests |
| Critério aceite #10 (sem regressão; só `dev`) | **PASS** no canônico; **RISCO** no workspace Cursor desatualizado |
| Residuals PLANO 0 R2–R5/R6 | R2/R3 feitos · R4 status quo · R5 unit OK · e2e Playwright pendente · R6 inventário sem repair |

**Conclusão:** PLANO 1 está íntegro na `dev` canônica. O maior risco de regressão agora é **trabalhar no clone errado** (pendrive atrás de `dev`), não falha de G1–G8 no repo.

---

## 2. Checklist G0–G8 vs evidência

| Etapa | Objetivo | Evidência | Status |
|-------|----------|-----------|--------|
| G0 | Aprovação / só `dev` | Doc + commits em `dev` | PASS |
| G1 | `updateSavedVehicle` + `plate_normalized` + UI | `78efde2` · migration `…120000…` · `customerVehicleService.g1.test.ts` | PASS |
| G2 | Dashboard + `/conta/veiculos/:id` | `8d697f0` · `AccountVehicleDetailPage` · router | PASS |
| G3 | Cor/notes/Storage/stock 4 níveis | `c093a1c` · `…130000_g3…` · `vehicleImageResolver.test.ts` | PASS |
| G4 | Ativo ≠ principal (`localStorage`) | `2b088d4` · `GarageContext` · `GarageActiveSwitcher` · `activeGarageStorage.test.ts` | PASS |
| G5 | Compat 3 estados | `b77f8da` · `compatibilityEngine.test.ts` (6) | PASS |
| G6 | Snapshot cart→order | `184b8c0` · migrations G6 · `vehicleSnapshot.test.ts` | PASS |
| G7 | Histórico append-only | `b2294fb` · `…150000_g7…` · `vehiclePartEventService.test.ts` | PASS |
| G8 | VAL + matriz §14 | `6c8268a` · `VAL-garagem-plano1.md` | PASS |
| Pós-G8 | Ativo↔placa + `sourceSnapshot` cache | `85d3574` | PASS |

---

## 3. Drift de workspace — resolvido 2026-11-18

| Clone | Papel | Regra |
|-------|-------|-------|
| `C:\Users\user\repos\FAL-PECAS-AUTOMOTIVAS` | **Canônico** (commit/push) | Fonte única de verdade |
| `d:\…\FAL PECAS AUTOMOTIVAS` (pendrive) | Espelho / backup | Só `git pull --ff-only origin dev`; sem feature isolada |

**Estado pós-ajuste:** ambos em `98acdc4` (`dev` = `origin/dev`, working tree limpa). WIP admin que estava só no pendrive foi consolidado no canônico (`fix(admin): sobe alturas…`).

**Protocolo anti-duplicidade:**
1. Codar e commitar no **repos**.
2. No pendrive: `git fetch origin && git pull --ff-only origin dev`.
3. Nunca manter feature só no pendrive; se aparecer diff local, trazer para o repos antes do reset/pull.
4. Cursor: preferir abrir a pasta do **repos**.

---

## 4. Guardrails do PLANO 1 (§17 / §22) — estado

| Regra | Estado |
|-------|--------|
| Ativo (`localStorage`) ≠ principal (`is_primary`) | OK no canônico |
| Compat default = não confirmada; sem falso positivo | Coberto por unit G5 |
| Snapshot imutável pós-edição garagem | Unit G6 + smoke VAL |
| `bought` intacto após `installed` | Unit G7 |
| Stock: nunca família como “exata” | Resolver G3 + testes |
| Proibido remount `HomeGarageSection` em paralelo ao hub | Arquivo existe; **não importado** fora de si — OK |
| Sem P2 (3D/oficinas/…) | Fora do VAL |
| Sem push/`main` sem ordem | Respeitado |
| Dedup `plate_normalized` | G1 + tests #22/#23 |
| R6: sem `repair` improvisado | Inventário só |

---

## 5. Pacote anti-regressão (operacional)

### 5.1 Comando gate (obrigatório antes de merge em `dev` tocando garagem/placa)

```bash
cd fal-pecas
npm test -- --run \
  src/services/customers/customerVehicleService.g1.test.ts \
  src/services/garage/ \
  src/services/compatibility/compatibilityEngine.test.ts \
  src/services/checkout/buyNowSession.test.ts \
  src/services/customers/vehicleImageResolver.test.ts \
  src/components/garage/garageVehicleUi.test.ts \
  src/services/plates/plano0Section12.r5.test.ts \
  src/services/customers/customerVehicleProgressive.test.ts \
  src/services/plates/pendingGarage.test.ts \
  src/services/plates/flushPendingGarage.test.ts
```

**Baseline 2026-11-18:** 12 files · **47 tests PASS**.

### 5.2 Checklist CR (copiar no PR)

- [ ] Clone = `repos` @ `dev` atualizado (`git status` + `git log -1`)
- [ ] Gate Vitest §5.1 verde
- [ ] Ativo ≠ principal (copy/UI)
- [ ] Sem remount `HomeGarageSection`
- [ ] Snapshot: editar veículo não altera pedido antigo
- [ ] Eventos: só append; sem UPDATE de tipo
- [ ] Sem escopo P2
- [ ] Sem migration `repair` / push `main` sem ordem eFe

### 5.3 Smoke manual mínimo (após mudança UI/fluxo)

1. Placa → confirmação → salvar → `/conta/veiculos`  
2. **Usar na loja** → chip “Ativo” no header → catálogo com badges  
3. Limpar ativo / trocar veículo  
4. Add cart com ativo → snapshot no carrinho  
5. (Se pedido pago disponível) timeline `bought` + declarar instalada  

### 5.4 Lacunas conscientes (não bloqueiam G8)

| Lacuna | Ação |
|--------|------|
| e2e Playwright #6/#11/#13 (R5) | Backlog; VAL unit cobre regressão lógica |
| RLS cross-cliente automatizado | Manual/ops; policies no VAL |
| R6 history drift | Só com ordem eFe |
| R4 re-upsert mestre na confirmação | Status quo até decisão |

### 5.5 Proteção de layout Header (pós-CTA Garagem)

- CTA `🚗 Garagem` (logo→busca) **coexiste** com `GarageActiveSwitcher` (cluster direito).  
- Remover o switcher = regressão G4. Gate visual: logado + ativo ⇒ chip “Ativo: …” à direita.

---

## 6. Ações recomendadas (agora)

1. **Fixar workspace Cursor** no path `repos` (ou sincronizar pendrive → `origin/dev`).  
2. Rodar gate §5.1 em CI local antes de qualquer commit garagem.  
3. Manter CTA Header só no canônico (diff uncommitted em `Header.tsx` — commit só se eFe pedir).  
4. Não abrir R6 repair nesta marcha.
