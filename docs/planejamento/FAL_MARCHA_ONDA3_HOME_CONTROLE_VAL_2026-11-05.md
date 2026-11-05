# VAL — MARCHA Onda 3 · Home layout + controle campanhas/destaques

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`

---

## Escopo

1. **Buscar pelo carro** abaixo de **Destaques** (hero só marca + CTAs; âncora `#veiculo`).  
2. Admin `/admin/home` coerente: regras claras, ordem ↑↓, ligar/desligar, limite 12 destaques, status “na loja agora”.  
3. Campanhas: desligar todas = carrossel vazio (sem fallback silencioso).

---

## Ordem da Home

Hero → Campanhas → **Destaques** → **Buscar pelo carro** → Ofertas → Categorias → Suspensão/direção

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | VehicleSelector abaixo dos Destaques | **PASS** |
| 2 | Painel explica Campanhas × Destaques × Ofertas | **PASS** |
| 3 | ↑↓ + Ligar/Desligar em campanhas e destaques | **PASS** |
| 4 | DB ativo vazio → sem carrossel (controle real) | **PASS** |
| 5 | `tsc --noEmit` | **PASS** |

---

## STOP

Próximo: condições de pagamento (11/12) = **gate eFe** · ou Onda 4 sob pedido.

**Assinatura:** VAL Onda 3 Home controle PASS 2026-11-05.
