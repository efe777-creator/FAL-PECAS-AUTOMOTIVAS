# FAL — VAL responsividade / proporção / cores PDP (pós-densidade)

**Data:** 2026-11-20  
**Branch:** `dev`  
**Rota medida:** `/produto/tdi1002`  
**Antiregress:** 35/35 PASS (`test:compat-antiregress`)

---

## Veredito

Densidade do buy-box ajustada para caber na dobra em monitores ≥900px de altura. Em laptop curto (768px) **Adicionar** fica acima da dobra; **Comprar agora** ainda exige ~40px de scroll. Mobile/tablet sem overflow horizontal; ordem galeria → buy → acordeões OK.

---

## Responsividade (medido no browser)

| Viewport | Layout | Overflow-X | Dobra CTAs | Notas |
|----------|--------|------------|------------|-------|
| 1440×900 | 55/45 side-by-side | Não | Add + Comprar + Favoritar OK | Alvo principal |
| 1366×768 | 55/45 | Não | Add OK; Comprar/Fav abaixo | Residual ~40px |
| 768×900 | Empilhado (`<lg`) | Não | N/A (scroll natural) | `lg` = 1024 |
| 390×844 | Empilhado order 1/2/3 | Não | Barra `PdpPurchaseBar` fixa | Galeria ~4:3 |

**Simetria desktop:** galeria ~55% / buy ~45% (confirmado `leftPct=55`). Altura buy ainda ≥ galeria (conteúdo comercial > imagem) — esperado; sticky `lg:top-20`.

---

## Cores vs referência FAL

| Elemento | Medido | Token / esperado |
|----------|--------|-----------------|
| Add (primary) | `rgb(242, 200, 75)` | `--fal-yellow` `#f2c84b` |
| Comprar (dark) | `rgb(48, 56, 70)` | `--fal-navy` `#303846` |
| Fundo | `#f4f6f7` | `--fal-bg` |
| Compat incompat | faixa vermelha framed | canônico E.2 / M8 |

Ordem CTA: Amarelo Add → Navy Comprar — alinhado à override da spec.

---

## Smoke funções (estado)

| Função | Status |
|--------|--------|
| Antiregress M1–M8 contratos | PASS 35 |
| CEP + Consultar (UI presente) | OK (placeholder restaurado) |
| Retirada sob demanda (link até cotar/selecionar) | OK |
| PaymentConditionHint + ícones Pix/Cartão/Boleto | OK |
| `StorePaymentMethodsBlock` removido do buy acima da dobra | Intencional (densidade); componente permanece no repo |
| Barra mobile `onBuyNow` | Presente |
| Compat antes do preço/CTAs | Mantido |

---

## O que ainda falta (backlog residual)

1. **Dobra 768px:** encaixar **Comprar agora** (+ Favoritar) sem scroll — falta ~40–90px (esconder ícones de pagamento em `max-height` ou fundir qty+disponível numa linha mais baixa).
2. **Spec preliminar 45/55 vs código 55/45:** galeria maior (55) — decisão de marcha; alinhar texto da SPEC se 55/45 for canônico definitivo.
3. **Ordem buy-box vs SPEC:** frete está **antes** de disponível/qty (SPEC lista qty→frete→disponível). Avaliar se reordenar.
4. **Header mock da referência** (mega-nav / faixa promo): fora de escopo PDP.
5. **Thumbs verticais à esquerda** (mock): confirmar se galeria atual já entrega layout vertical desktop em todos os breakpoints.
6. **Faixa verde “compatível”** da referência: produto de teste estava **incompatível** (HB20) — validar visual compatível com veículo PVC cruzado.
7. **Commit marcha** na `dev` + push: aguardando autorização explícita.
8. **Dark mode visual QA** lado a lado com light (tokens `dark:` presentes; smoke visual pendente).

---

## Mudanças desta rodada (densidade)

- Container `py-2/3`; gaps menores; sticky `top-20`
- Frete compacto: CEP inline; retirada oculta até escolha/cotação
- Remoção do bloco expansível de meios do first-paint do buy
- CTAs `h-10`; motivo compat `line-clamp-1`
- Teste M6 atualizado (`lg:top-20`)

---

## Próximo passo sugerido

1. Microcorte residual para 1366×768 (ícones pagamento / footnote).  
2. QA visual dark + produto **compatível**.  
3. Commit Marcha 12 na `dev`.

**Microcorte extra:** `PdpPaymentIcons` oculto abaixo de 820px de altura de viewport (`[@media(min-height:820px)]:flex`).

