# VAL — Pós-separação por modalidade (retirada / own / ME)

**Data:** 2026-11-12  
**Auth:** eFe — implementação do plano  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Migration:** `20261112200000_post_separation_modality_ops.sql`

---

## 1. Resultado

| Modalidade | Comportamento | Status |
|------------|---------------|--------|
| Retirada | Autorizar → cliente “Pronto para retirar” → Cliente retirou → entregue | **PASS código + SQL remoto** |
| Frete próprio | Separação libera Confirmar envio + rastreio opc.; packing não bloqueia | **PASS** |
| Melhor Envio | Prefill medidas cotação → etiqueta → despacho agora/depois → obs/rastreio | **PASS** |

---

## 2. RPCs remotas

| Função | Uso |
|--------|-----|
| `admin_authorize_store_pickup` | metadata.pickup + evento `pickup_authorized` |
| `admin_confirm_store_pickup` | autorizado → enviado → entregue (bypass mock) |
| `admin_set_shipment_tracking` | rastreio/obs pós-despacho |
| `ship_order` (atualizado) | packing só ME; own sem packing |
| `admin_logistics_queue_counts` | volumes=só ME; own sem packing |

Aplicado via `supabase db query --remote --yes -f …`.

## 2b. Auditoria / correções (mesmo dia)

| Issue | Correção |
|-------|----------|
| Fila volumes ainda incluía own | Só Melhor Envio |
| Fila own exigia packing | Removido no FE + RPC counts |
| Wizard own bloqueava em Volumes | Volumes skipped (opc.) |
| Prefill cotação sem alocação | Seed + alocar no 1º volume |
| Copy next-step own falava em packing | Textos alinhados ao fluxo simples |

---

## 3. Testes

```
npx vitest run src/lib/adminLogisticsQueues.test.ts \
  src/lib/orderOpsWizard.test.ts src/lib/ownDeliveryOps.test.ts \
  src/lib/meLabelShipGates.test.ts src/lib/storePickupOps.test.ts
```

**PASS** (unit da onda).

---

## 4. Fora desta onda

- Combinar entrega ao vivo (mensagem “alguém no local?”)
- Push/WhatsApp/e-mail transacional
- Deploy Netlify / `git push` (pedir MARCHA se quiser)

---

**Assinatura:** pós-separação modalidade · SQL remoto · 2026-11-12.
