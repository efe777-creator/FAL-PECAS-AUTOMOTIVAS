# VAL — Smoke MVP-1 no espelho eFe

**Data:** 2026-11-09 · ~14h25  
**Auth:** eFe — manter deploy · próximo passo = smoke  
**URL eFe:** https://fal-pecas-automotivas-efe.netlify.app  
**Preview fernando (#249):** https://deploy-preview-249--fal-pecas-automotivas.netlify.app/  
**Deploy fernando prod:** mantido bloqueado (crédito) — OK por decisão eFe

---

## Smoke automatizado (UI)

| # | Cenário | eFe | Preview #249 |
|---|---------|-----|--------------|
| 1 | Home: Campanhas → Buscar pelo carro → Destaques | **PASS** | **PASS** |
| 2 | Banner cookies | **PASS** | Visível (HUD Netlify interceptou clique) |
| 3 | `/trocas-devolucoes` + versão | **PASS** | Link footer OK |
| 4 | Footer Trocas | **PASS** | **PASS** |
| 5 | Carrinho guest CTAs | **PASS** | (só eFe nesta rodada) |

## Smoke humano ainda pendente (credenciais)

| # | Cenário | Status |
|---|---------|--------|
| A | Cotar frete ME/próprio → `place_order` | Pendente |
| B | Pix ↔ cartão + webhook (Edges novas) | Pendente |
| C | Admin: separação A4 / margem / KPIs dashboard | Pendente |
| D | Expedição etiqueta ME | Pendente |

---

## Próximo passo sugerido

**G3/G4 humano no eFe:** pagamento real (TEST) + frete cotável, com secrets já no projeto wtbp.

**Assinatura:** VAL smoke eFe UI PASS · smoke MP/frete humano pendente · 2026-11-09.
