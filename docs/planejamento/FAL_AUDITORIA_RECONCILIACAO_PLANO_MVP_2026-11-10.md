# Auditoria de reconciliação — Plano Canônico MVP × tip atual

**Data:** 2026-11-10  
**Auth:** eFe — analisar o que já foi feito / fora do plano / ainda aberto  
**Tip:** `main` `6dcd06a` · eFe deploy `6af3728aa529d6e05f777cab`  
**Plano:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
**Matriz atualizada:** [FAL_MATRIZ_AJUSTES_001_034_2026-11-09.md](./FAL_MATRIZ_AJUSTES_001_034_2026-11-09.md)  
**Conclusão código:** [FAL_MARCHA_RELATORIO_CONCLUSAO_PLANO_MVP_2026-11-10.md](./FAL_MARCHA_RELATORIO_CONCLUSAO_PLANO_MVP_2026-11-10.md)

---

## Veredito em 30s

| Leitura | Resultado |
|---------|-----------|
| Matriz 09/11 | **DEFASADA** — vários IDs ainda N/P apesar de VAL PASS |
| Código do Pacote MVP-1 | **CONCLUÍDO** (#249) |
| Extensões 10/11 no plano ou adjacentes | Em grande parte **JÁ NO AR** (#250–#253) |
| Itens **à frente** do corte MVP | 028 apiplacas live · Mobile UX · PVC wildcard · ME prepare |
| O que ainda é “plano MVP” aberto | Quase só **gates humanos** G3–G8 + dados |

---

## 1. Já concluídos (código + evidência) — matriz estava atrasada

| ID | Antes (09/11) | Agora | Evidência |
|----|---------------|-------|-----------|
| **002** | P | **I/P** | Troca apps + V3 year-range VAL + PVC wildcard #252 |
| **015** | P | **I** | Lista separação A4 VAL MVP-1 |
| **021** | P parcial | **I** | Híbrido + teto + `store_home_settings.featured_display_limit` Onda1 |
| **028** | **N** | **I/P** | Evo1 mock + **apiplacas live** INT8C36 PASS (à frente do MVP-lite) |
| **029** | P | **I** | Ordem Home + Onda1 (trust/garagem/vigência) #250 |
| **033** | **N** | **I** | Margem no pedido VAL MVP-1 — matriz errada |
| **034** | P/N | **I** | KPIs dashboard VAL MVP-1 |
| **014** | P | **I/P** | Cotação guest + **prepare etiqueta** PASS; purchase = GATE |
| **023** | P | **I/P** | Mobile UX #253 (críticos nav/admin) |
| **027** | P | **I/P** | Cookies + páginas legais live; advogado = G6 |
| **031/032/030** | P/N | **I/P** | UI mínima MVP-1; ops/guest total/ticket formal fora |

---

## 2. Ainda abertos no plano (quase todos humanos)

| ID / Gate | O que falta | Quem |
|-----------|-------------|------|
| **001** | Limpeza dados teste (só M5/G8) | eFe |
| **003/013** residual | Sinônimos + massa promo/apps | eFe (dado) |
| **017** / **G3** | Pix **pago** + webhook approved + cartão | eFe |
| **014** residual / **G4** | Purchase etiqueta + rastreio | eFe (saldo ME) |
| **G5** | Smoke rotina separação UI browser (auth redirect) | eFe |
| **027** residual / **G6** | Texto jurídico advogado + CNPJ origem real | eFe |
| **G7** | 14 E2E oficiais + CWV ops | eFe |
| **G8** | Crédito Netlify fernando + 001 + primeiras vendas | eFe |
| Ops | Redirect URLs Supabase → eFe | eFe |

---

## 3. Fora do plano / Evolução (não bloqueia G8)

| Item | Status | Nota |
|------|--------|------|
| 004, 005, 008, 011, 019, 020, 026 | N | Evolução 1 — corretamente fora |
| 028 **produção plena / saldo contínuo** | Parcial live | Adapter ok; custo/contrato = Evo comercial |
| Home Ondas **2–4** | Pacotes docs | Fora do cutover MVP |
| Guest checkout **100%** sem login | Não | 030 mínimo já feito |
| D-FRETE cutover **C** | Não | Assinatura à parte |
| M8 estorno / wallets / BI / kits | Não | Pós-MVP |
| **Mobile UX** (além do 023 mínimo) | **FEITO** | Extrapolou o plano — ok, não é dívida |
| **PVC blank engine/versão** | **FEITO** | Extensão de 002/003 — não estava nomeado no Pacote MVP-1 |
| **Frete retirada** PDP/checkout | **FEITO** | Extensão de 014 — adjacente |
| Pagamentos PG12–18 finos | Aberto | Plano Pagamentos, não matriz 001–034 |

---

## 4. Divergências críticas da matriz antiga

1. **033 = N** na matriz → na verdade **I** desde 09/11 (VAL margem).  
2. **028 = N** → na verdade **I/P** com apiplacas live (10/11).  
3. **014** tratado como “só código” → **prepare ME live já PASS**.  
4. Relatório “WT grande não commitado” (onde estamos) → **obsoleto** (#250–#253).  
5. “Conclusão = só código MVP-1” subestima extensões **já shipadas** que o plano chamava de Evolução/ops.

---

## 5. Score gates reconciliado (pós-atualizações)

| Gate | Score | Motivo da mudança vs auditoria M0 |
|------|-------|-----------------------------------|
| G1 | Amarelo↑ | Placa+PVC+Home no ar; falta massa apps |
| G2 | Amarelo→verde eFe | Onda1+destaques; falta conteúdo promo |
| G3 | Amarelo | Create Pix OK; approve/cartão humanos |
| G4 | Amarelo↑ | Prepare PASS (era vermelho/amarelo-baixo) |
| G5 | Amarelo↑ | 031/015/033 código OK; smoke UI auth |
| G6 | Amarelo | Legal mínimo live; advogado |
| G7 | Amarelo | 034 OK; E2E oficiais |
| G8 | Vermelho | fernando + 001 |

---

## 6. Fila real restante (só o que importa)

```text
1) Humano G3: pagar Pix + webhook → em_analise (+ cartão)
2) Humano G4: comprar etiqueta ME no pedido âncora
3) Ops: Redirect Supabase + CNPJ origem
4) Crédito Netlify → publish fernando
5) G6 advogado · G7 E2E · G8/001
```

**Não reabrir** fatias de código do Pacote MVP-1 / Home Onda1 / placa Evo1 só porque a matriz antiga dizia N.

**Assinatura:** Auditoria reconciliação Plano MVP · matriz 09/11 corrigida nesta MARCHA · 2026-11-10.
