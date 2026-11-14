# MARCHA 5 — Matriz humana — checkout claro + canais — 2026-11-14

**Auth:** eFe · **Pré-requisito:** MARCHA 4 PASS · **STOP:** sem Netlify/Edge sem MARCHA 6

## Smoke Chrome real (desktop) — 2026-11-14 ~14:16

Pedido: `68fbe07f-74a7-4af6-bad7-c49dbba0f3e7`  
URL: `http://localhost:5173/conta/pedidos/68fbe07f-74a7-4af6-bad7-c49dbba0f3e7` · seção **Continuar pagamento**

### PCI identity + digitação (crédito ↔ débito)

| Check | Resultado |
| --- | --- |
| Digitar PAN `5031 4332 1540 6351` no Secure Field | **PASS** (Chrome real) |
| Digitar validade `11/30` | **PASS** |
| CVV via automação | **FLAKY** (alvo iframe estreito; não bloqueia se PAN/validade persistem) |
| Crédito → Débito: H2 vira “débito”; PAN+validade intactos | **PASS** |
| Débito → Crédito: H2 “crédito”; PAN+validade intactos | **PASS** |
| Pix no resume: “Cobrança Pix expirada” + “Gerar novo Pix” | **PASS** |
| Seletor Pix / Crédito / Débito em Meus pedidos | **PASS** |

### Smoke CursorBrowser (anterior)

| Check | Resultado |
| --- | --- |
| `sameIframes` crédito↔débito no checkout mid-pay | PASS |
| Momentos + mid-pay Entrega + Voltar ao pagamento | PASS |
| Digitação no CursorBrowser | N/A (cross-origin) |

## Matriz

| # | Cenário | Desktop Chrome/Edge | Android Chrome | iPhone Safari |
| --- | --- | --- | --- | --- |
| 1 | Carrinho → 3 momentos → Pix/crédito/débito no step 3 | **PASS** momentos+NF; canais mid-pay/resume OK | | |
| 2 | Compra direta (PDP buy_now) | PARTIAL (Comprar agora → /checkout) | | |
| 3 | Pix: gerar QR, expirar, gerar de novo | **PASS** (Gerar → QR R$1,00 · 29:52) | | |
| 4 | Pix ↔ cartão no seletor (mesmo pedido) | PASS resume | | |
| 5 | Crédito: digitar, ↔ débito (PCI identity) | **PASS** PAN+validade | | |
| 6 | Débito: UI 1x | PASS (H2 débito) | | |
| 7 | Rejected / pending / erro rede | | | |
| 8 | Refresh mid-pay + retomada Meus pedidos | PASS retomada Meus pedidos | | |
| 9 | Duplo clique / duas abas | | | |
| 10 | Mid-pay entrega read-only + Voltar ao pagamento | PASS (CursorBrowser) | | |
| 11 | Leave carrinho + Meus pedidos | PASS | | |
| 12 | Retirada: NF visível | **PASS** (“Endereço na nota fiscal” + Trocar) | | |

## Critério de PASS global

- Desktop Chrome: **PASS parcial forte** (PCI digitar + crédito↔débito + resume canais).
- Mobile: **ainda pendente** — critério formal pede ≥1 mobile.
- Resultado global MARCHA 5: **PENDENTE fechamento** (mobile + itens 2/7/9/12).

## Assinatura

- Executor smoke Chrome real: agente (computer use) · 2026-11-14 14:16
- Mobile / fechamento: eFe
- Resultado global: **PENDENTE mobile** — desktop PCI OK

**Assinatura:** MARCHA 5 · desktop Chrome PASS (PCI) · mobile pendente · 2026-11-14.
