# MARCHA checkout claro + canais — STATUS / ETA — 2026-11-14 14:17

**Pedido smoke:** `68fbe07f-74a7-4af6-bad7-c49dbba0f3e7` · `localhost:5173`

## Onde estamos

| Marcha | Status | Evidência |
| --- | --- | --- |
| 0 Baseline PCI | DONE | `FAL_MARCHA_CHECKOUT_CLARO_CANAIS_BASELINE_2026-11-14.md` |
| 1 Canal/sessão | DONE | `checkoutPaymentChannel.ts` + testes |
| 2 Pix/crédito/débito sem remount | DONE | Checkout + ResumeOrder (Meus pedidos) |
| 3 Navegação 3 momentos | DONE | Labels + CTAs + NF retirada |
| 4 Gates auto | DONE | 14 testes + tsc + PCI file intacto |
| 5 Homologação humana | **~85% desktop PASS** | PCI+Pix+NF retirada+3 momentos; mobile pendente eFe |
| 6 Release | **PACOTE PRONTO / NÃO PUBLICADO** | `FAL_MARCHA_CHECKOUT_CLARO_CANAIS_M6_RELEASE_READY_2026-11-14.md` |

## Smoke CP (checkout/pagamento) — desktop Chrome 14:17

| # | Teste | Resultado |
| --- | --- | --- |
| CP-1 | Seletor Pix/Crédito/Débito em Meus pedidos | PASS |
| CP-2 | Digitar PAN + validade nos Secure Fields | PASS |
| CP-3 | Crédito ↔ débito preserva PAN/validade | PASS |
| CP-4 | Pix expirado → Gerar novo Pix → QR + timer ~30 min | **PASS** (R$ 1,00 · 29:52) |
| CP-5 | Mid-pay entrega read-only (CursorBrowser) | PASS |
| CP-6 | Re-gate M4 (tsc + 14 testes) 14:19 | **PASS** |
| CP-7 | Android / iPhone | PENDENTE eFe |
| CP-8 | Carrinho → checkout 3 momentos + NF retirada | **PASS** (14:22 · Endereço na NF + Trocar) |
| CP-9 | Comprar agora catálogo → /checkout | PARTIAL (soft nav OK; hard reload perde sessão IDE) |
| CP-10 | Step 3 rádios Pix / crédito / débito | **PASS** (14:23 · subtítulo “Escolha como pagar”) |
| CP-11 | Rejected / pending / 2 abas | PENDENTE opcional |

## O que ainda deve ser feito

1. **M5 mobile** — 1 smoke Android Chrome ou iPhone Safari (mínimo formal).
2. **M5 residual desktop** — buy_now, NF em jornada nova, rejected/2 abas (opcional se mobile OK + PCI já PASS).
3. **M6** — build + deploy Netlify **somente** após auth eFe; rollback = redeploy front anterior + desligar crédito/débito em `store_payment_display` se preciso.

## ETA

| Próximo | Tempo estimado | Dono |
| --- | --- | --- |
| Fechar M5 no mobile | 15–30 min | eFe no aparelho |
| Residuais desktop (opcional) | 20–40 min | eFe / agente assistindo |
| M6 publish (após auth) | 10–20 min | agente + eFe auth |

**Caminho crítico:** mobile M5 → auth M6 → publish.

**Não bloqueia código:** implementação M1–M4 está no working tree; sem mudança Edge/DB.

## Assinatura

STATUS/ETA · 2026-11-14 14:17 · smoke CP-4 Pix QR PASS · M5 mobile + M6 auth pendentes.
