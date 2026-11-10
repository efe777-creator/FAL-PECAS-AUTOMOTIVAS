# MARCHA — Onde estamos · o que falta para finalizar

**Data:** 2026-11-10  
**Auth:** eFe — `MARCHA VER ONDE ESTAMOS OQUE FALTA PARA FINALIZAR`  
**Tip `origin/main` (última sync vista):** ~`331a1bb` / série MVP-1 + #249  
**Espelho eFe:** https://fal-pecas-automotivas-efe.netlify.app  
**Prod fernando:** https://fal-pecas-automotivas.netlify.app — **bloqueada (crédito Netlify)**  

Fontes cruzadas: relatório FINAL plano mestre 09/11 · status comercial eFe 09/11 · próximos passos 09/11 (atualizado 10/11) · specs Home/Placa · working tree local.

---

## Veredito (30s)

| Camada | Estado |
|--------|--------|
| **Código do plano mestre (Ondas 0–3 base)** | **ENCERRADO** (#247) |
| **Pacote MVP-1 no `main` + Edges** | **ENCERRADO** (#249 + pagamentos/ME) |
| **Espelho eFe comercial** | **LIVE** — frete ME + Pix create smoke PASS |
| **Produção fernando / venda plena (G8)** | **NÃO** — crédito Netlify + gates humanos |
| **Working tree local (10/11)** | **Grande acumulado NÃO commitado** (Home, placa, V3 anos, frete retirada…) |

**Leitura:** para “finalizar” no sentido de **código do plano**, já está fechado.  
Para **abrir venda real**, falta bola humana + publicar o que está no working tree + gates G1–G8.

---

## 1. O que já está pronto

### No tip / produção eFe
- Fundação UI, funil, admin, checkout MP, Central de Pedidos, frete (mock→ME env-driven)
- MVP-1: guest fricção ↓, home destaques, pagamentos gestão, estoque/separação base, margem/KPI
- Smokes: UI eFe · G4 frete guest · G3 Pix **create** (approve/webhook ainda humano)
- Edges: `create-mp-payment`, quote/own-delivery, ME label/webhook, etc.

### Plano mestre — STOP código
Relatório FINAL 09/11: MARCHA código **ENCERRADA**. Cutover frete C / MP prod fernando = gate, não “falta MARCHA”.

---

## 2. O que falta para “finalizar” (fila real)

### A — Imediato (ops / humano) — **bloqueia G8**

| # | Item | Quem | Bloqueia |
|---|------|------|----------|
| 1 | **Crédito Netlify** + publish fernando ← tip `main` | fernando/eFe | Loja pública STALE |
| 2 | **Pagar Pix** + confirmar **webhook** → approved | eFe | G3 completo |
| 3 | Smoke **cartão** Brick | eFe | G3 cartão |
| 4 | **Etiqueta ME** (saldo sandbox/prod) + postagem | eFe | G4 contratável |
| 5 | Smoke admin: separação / pagamentos / margem | eFe | ops |
| 6 | Tarifas frete próprio (dados) se for usar | eFe | O1-D ops |
| 7 | Texto jurídico formal (advogado) | eFe | G6 |
| 8 | E2E cenários oficiais + primeiras vendas | eFe | G7/G8 |

### B — Working tree local (código pronto, **sem PR/deploy**)

Acumulado em `main` dirty + untracked (10/11):

| Pacote | Status local | Falta |
|--------|--------------|-------|
| Home Onda 1 (ordem, trust, vigência, destaques) | DONE WT | SQL `vigencia` + PR + smoke |
| UX Home (entrada unificada / menus) | DONE WT | PR + smoke |
| Busca por placa Evolução 1 (PoC mock + scaffold apiplacas) | DONE WT | SQL `cached_plates` + Edge `plate-lookup` + PR |
| V3 intervalo anos PVC aplicação | DONE WT | PR + smoke |
| Frete retirada PDP/checkout | DONE WT | PR + smoke |
| Migrations locais (`plate_lookup_cache`, `vehicle_canonical`, home vigencia…) | Arquivos no repo | **Apply wtbp só com OK eFe** |

**Sem `MARCHA DEPLOY` / commit / apply, isso não “finaliza” em produção.**

### C — Evolução (fora do cutover MVP agora)

| Item | Nota |
|------|------|
| Placa Evo 2/3 (API paga apiplacas) | Sem saldo sem autorização |
| Home Ondas 2–4 | Pacotes documentados; aguarda auth |
| Guest checkout 100% sem login | Evolução (030 parcial) |
| Onda 2 cancel pós-pago / estorno (M8) | Política + auth |
| Webhook MP MCP diag (M9) | Ressalva |
| D-FRETE **C** cutover | Nova assinatura |
| Wallets / BI / kits / F11 | Pós-MVP |

---

## 3. Score gates MVP (visão atual)

| Gate | Score | O que falta |
|------|-------|-------------|
| G1 Produto | Amarelo | Massa apps/sinônimos/estoque confiável |
| G2 Experiência | Amarelo→verde no eFe | Home WT + publish; preço único em massa |
| G3 Pagamento | Amarelo | Approve webhook + cartão; fernando MP |
| G4 Frete | Amarelo | Etiqueta/rastreio; fernando vars |
| G5 Ops estoque/exp | Amarelo | Smoke admin + dados |
| G6 Jurídico | Amarelo | Texto formal advogado |
| G7 E2E/monitor | Amarelo | Cenários oficiais |
| G8 Liberação | Vermelho | G1–G7 + fernando no ar + primeiras vendas |

---

## 4. Ordem sugerida para fechar

```text
1) MARCHA DEPLOY do WT (Home + placa Evo1 + V3 + frete retirada)
   → commit/PR/merge → Edges plate-lookup → apply SQL com OK → smoke eFe
2) eFe: Pix pago + webhook + cartão + etiqueta ME
3) Crédito Netlify → publish fernando ← main
4) Gates G1/G5/G6 dados+jurídico
5) G8 liberação controlada
```

**Não misturar** cutover D-FRETE C / apiplacas saldo / M8 estorno nesta fila de finalização MVP.

---

## 5. Resposta direta

| Pergunta | Resposta |
|----------|----------|
| O código do plano acabou? | **Sim** (mestre + MVP-1 base). |
| Dá para vender pleno amanhã? | **Não** — fernando bloqueada + G3 approve + G8. |
| O que o agente ainda tem na mesa? | **WT grande** (Home/placa/V3/frete) → precisa MARCHA DEPLOY. |
| O que só eFe fecha? | Crédito Netlify, pagar Pix/webhook, cartão, etiqueta, dados, jurídico, G8. |

---

**Assinatura:** MARCHA onde estamos / finalizar · 2026-11-10
