# VAL — MARCHA Onda 3 · Home comercial (pacote 1)

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`  
**Plano:** [FAL_PLANO_MESTRE_SITE_2026-11-05.md](./FAL_PLANO_MESTRE_SITE_2026-11-05.md) §4 Onda 3

---

## Escopo (P1)

“Buscar pelo carro” no hero · Destaques × Ofertas sem repetir · rodapé contato/CNPJ(env)/termos · páginas `/termos` e `/privacidade` · copy técnica da home removida.

**Fora deste pacote:** carrosséis 07/08 · admin destaques/campanhas 09/10 · condições de pagamento 11/12 (decisão eFe).

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | `VehicleSelector` no hero (topo), não no fim da página | **PASS** |
| 2 | `excludeProductsById` — ofertas têm prioridade sobre destaques | **PASS** (unit) |
| 3 | Footer: Institucional + Termos/Privacidade; CNPJ/contato via env | **PASS** |
| 4 | Rotas `/termos` e `/privacidade` + links no cadastro | **PASS** |
| 5 | `tsc --noEmit` | **PASS** |

---

## STOP / próximo Onda 3

1. Carrossel de imagens (07) e/ou de produtos (08)  
2. Admin destaques/campanhas (09/10)  
3. Condições de pagamento (11/12) — **gate eFe**

**Assinatura:** VAL Onda 3 Home P1 PASS 2026-11-05.
