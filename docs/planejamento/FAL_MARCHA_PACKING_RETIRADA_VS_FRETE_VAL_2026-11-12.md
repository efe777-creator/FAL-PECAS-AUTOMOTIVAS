# VAL — MARCHA packing: retirada vs frete + textos ops

**Data:** 2026-11-12  
**Auth:** eFe — `MARCHA`  
**Escopo:** UX/ops admin — volumes opcionais na retirada; packing obrigatório por modalidade de frete; textos/próximo passo/wizard  
**Sem:** migrate remoto · purchase ME live · push `origin` (só se eFe pedir)

---

## 1. Regra operacional

| Modalidade | Volumes para separar | Packing para expedir | Quando confirmar medidas |
|------------|----------------------|----------------------|--------------------------|
| Retirada na loja (`mock:pickup` / service pickup) | **Não obrigatório** | Não bloqueia | Opcional; pós-separação se quiser |
| Melhor Envio | Pode rascunhar | **Obrigatório** (alocação) | Preferencialmente pós-separação |
| Frete próprio | Pode rascunhar | **Obrigatório** | Preferencialmente pós-separação |

---

## 2. Código tocado

| Área | Arquivo | Mudança |
|------|---------|---------|
| Detecção | `orderShippingKind.ts` | `isOrderStorePickup` |
| Packing UI | `OrderPackingPanel.tsx` | copy + CTA por modalidade; sem “Salvar” vazio na retirada |
| Next action | `adminLogisticsQueues.ts` | pickup **antes** de `mock_sandbox` |
| Wizard | `orderOpsWizard.ts` | volumes/etiqueta skipped na retirada; hints |
| Próximo passo | `orderLifecycle.ts` + `AdminOrderDetailPage` | textos por status × modalidade |
| Expedição | `OwnShipPanel` / `MeExpeditionPanel` | packing gate = true na retirada; copy ME |

---

## 3. Evidência testes

```
npx vitest run \
  src/lib/adminLogisticsQueues.test.ts \
  src/lib/orderOpsWizard.test.ts \
  src/lib/orderPackingAllocation.test.ts \
  src/lib/meLabelPurchaseGates.test.ts \
  src/lib/meLabelShipGates.test.ts \
  src/lib/ownDeliveryOps.test.ts
```

| Resultado | |
|-----------|--|
| Suites | **6 PASS** |
| Cases | **36 PASS** |
| Novo caso | `mock:pickup` → `retirada` (não `mock_sandbox`) |
| Novo caso | wizard retirada: volumes + etiqueta `skipped` |

---

## 4. Filas

Fila **Preparar volumes** continua só ME/Own sem packing completo. Retirada **não** entra.

---

## 5. PASS / aberto

| | |
|--|--|
| **PASS** | Regra retirada vs frete no painel + next-action + wizard + unit |
| **Build** | **PASS** — `npm run build` |
| **Deploy Netlify** | **PASS** — `6af60c380460aa12bb519c8e` · https://fal-pecas-automotivas-efe.netlify.app/ |
| **Smoke staff UI** | Opcional — abrir pedido retirada e ME em `pronto_para_envio` |
| **STOP** | Sem ME-03 live · sem migrate frete V2.2.1 remota · sem `git push` nesta MARCHA |

---

**Assinatura:** MARCHA packing retirada vs frete · deploy front · 2026-11-12.
