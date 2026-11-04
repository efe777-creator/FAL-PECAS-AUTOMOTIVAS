# FAL 3.0 — Plano soberano de finalização (Fase α)

**Data:** 2026-10-10 · **sync execução:** 2026-11-04  
**Tipo:** MARCHA SOBERANA DE PLANEJAMENTO (documento canônico)  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Loja:** https://fal-pecas-automotivas.netlify.app  
**Estado do plano:** **α ENCERRADA** 04/11 — [STOP formal](./FAL_STOP_ALPHA_FORMAL_2026-11-04.md) · [estado final](./FAL_ESTADO_FINAL_ALPHA_2026-11-04.md)  
**Runbook:** [planejamento](./FAL_PLANEJAMENTO_PROXIMOS_PASSOS_ALPHA_2026-11-04.md) · [backlog pós-α](./FAL_BACKLOG_POS_ALPHA_2026-11-04.md)

D-FRETE **B** e Gate **SIM** assinados 04/11. Pós-α: [logística/medidas](./FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md).

---

## 0. Definições

| Termo | Significado |
|-------|-------------|
| **Fase α** | Primeira operação comercial **controlada** (aceite eFe no gate α) |
| **Projeto completo PRD** | F1→F13 / escala — **fora** do fechamento α |
| **VALIDADO agente** | Código + VAL/unit/smoke documentado |
| **ACEITE comercial** | Assinatura eFe + evidências humanas (MP/frete/E2E) |
| **STOP agente** | Sem próxima MARCHA técnica sem auth/decisão |

**Fontes oficiais cruzadas**

| Doc | Papel |
|------|--------|
| [Molde](./FAL_STATUS_CONSOLIDADO_MOLDE_2026-10-09.md) | Matriz de estados |
| [Gate α](./FAL_ALPHA_GATE_2026-10-10.md) | Aceite operação controlada |
| [D-FRETE](./FAL_D_FRETE_DECISAO_2026-10-10.md) | Política frete |
| [Plano frete](./FAL_PLANO_FRETE_FINALIZACAO_2026-10-10.md) | E1–E10 frete |
| [Auditoria frete A–J](./FAL_AUDITORIA_FRETE_COTACAO_ENTREGA_2026-10-10.md) | Evidências frete |
| [MP prep](./FAL_MP_SMOKE_PREP_2026-10-09.md) / [MP status](./FAL_MP_SMOKE_STATUS_2026-10-10.md) | Smoke pagamento |
| [E2E/prod](./FAL_E2E_PRODUCAO_STATUS_2026-10-10.md) | Compra + Netlify |
| [HOLD P2](./FAL_P2_HOLD_RECONFIRMACAO_2026-10-10.md) | Fora de α |
| ROADMAP / PRD | Escopo longo pós-α |

---

## 1. Veredito — onde estamos

```text
████████████████████████░░░░  ~80% caminho α (código/docs)
████░░░░░░░░░░░░░░░░░░░░░░░░  ~20% aceite comercial (humano)
```

| Camada | Situação |
|--------|----------|
| Dados / catálogo / admin | **Pronta** para operação controlada |
| Loja (browse → carrinho → checkout código) | **Pronta** (E2E-pré até login; catálogo OK 04/11) |
| Pagamento MP | Código **pronto**; H1–H5 **PASS** 14/10; smoke Pix/cartão **pendente humano** |
| Frete | UI sandbox **pronta**; α planejada com **B**; live só se **C** |
| Deploy Netlify ↔ `main` | **S0 PASS** 04/11 — bundle `index-DYpbbWUS.js` |
| Docs PRD/ROADMAP/gate | **Sync FATO** 04/11 (MARCHA_DOCS_SYNC) |
| Aceite gate α | **Pendente** assinatura eFe |

**Conclusão:** a α não falta feature grande do agente; falta **S1 (D-FRETE B assinado) + S2 (smoke MP) + S4 (pedido pago) + S5 (gate)**.

---

## 2. Inventário do que já está FEITO (não reabrir)

| # | Entrega | Evidência | Estado |
|---|---------|-----------|--------|
| F01 | Onda 0–1 / schema-first | STATUS_ONDA1 | ENCERRADO |
| F02 | FIND-004 M1–M5 apps PVC | VALs M1–M5 | ENCERRADO |
| F03 | UI apps/anos + PDP A–D | VALs | VALIDADO |
| F04 | Card UX + carrinho smoke | VAL card | VALIDADO |
| F05 | Admin Cat→Grupo→Sub | VAL classif. | VALIDADO |
| F06 | Admin Aplicações | VAL apps | VALIDADO |
| F07 | Admin Preços UX `%` | VAL preços | VALIDADO |
| F08 | F9-F meios MP no place_order | VAL F9-F | IMPLEMENTADO |
| F09 | E2E pré-pagamento | VAL E2E-pré | VALIDADO |
| F10 | Frete auditoria A–J + plano | docs frete | VALIDADO |
| F11 | Frete registry/envelope/edge esqueleto/MCP | VAL estrutura | VALIDADO |
| F12 | Frete UI PDP/carrinho/checkout sandbox | VAL + PRs #29–#31 | VALIDADO |
| F13 | Carrinho → PDP (links) | PRs #33–#35 | IMPLEMENTADO (git) |
| F14 | Checkout steps clicáveis + seed Pix QR / erros Edge | [VAL](./FAL_MARCHA_CHECKOUT_STEPS_PIX_VAL_2026-10-10.md) | IMPLEMENTADO (git) — smoke Pix humano |

**Regra:** regressão só com finding novo + MARCHA nomeada.

---

## 3. Critérios de fechamento da Fase α (checklist mestre)

Marcar **PASS** só com evidência. Gate α só fecha com todos os **obrigatórios** PASS ou **ACEITE DE RISCO** explícito.

### 3.1 Obrigatórios

| ID | Critério | Responsável | Evidência | Status |
|----|----------|-------------|-----------|--------|
| α-OPS-1 | Netlify publicando `main` atual (bundle ≠ stale) | eFe / Netlify | `index-DYpbbWUS.js` + catálogo 04/11 | **PASS** (04/11) |
| α-MP-1 | H1–H6 preenchidos | eFe | [H1H6](./FAL_MP_SMOKE_H1H6_CHECK_2026-10-14.md) · VAL S2 | H1–H6 **PASS** (H6 user existente 04/11) |
| α-MP-H5 | Checkout **não** em «Pagamento (simulado)» | eFe | Recheck S2 04/11 — «Pagamento — Mercado Pago» | **PASS** |
| α-MP-2 | Pix sandbox PASS (ou BLOQUEADO documentado) | eFe | [MP status](./FAL_MP_SMOKE_STATUS_2026-10-10.md) · order `4b3e2f33…` | **PARCIAL** (pending OK; QR UI **FAIL** FIND-SMOKE-UI-001) |
| α-MP-3 | Cartão sandbox PASS (ou BLOQUEADO documentado) | eFe | order `b3312ed0…` | **PARCIAL** (pedido OK; Brick **FAIL** FIND-SMOKE-UI-001) |
| α-MP-4 | Webhook: PASS ou NÃO TESTÁVEL (secret) explícito | eFe | notifications_history vazio; pedidos ainda aguardando | **NÃO OBSERVADO** |
| α-FR-1 | D-FRETE assinado A **ou** B **ou** C | eFe | [ficha](./FAL_D_FRETE_DECISAO_2026-10-10.md) | **PENDENTE** (plano = B) |
| α-FR-2 | Mensagem ao cliente + expedição preenchidas | eFe | ficha D-FRETE | **PENDENTE** |
| α-E2E-1 | 1 pedido teste com pagamento sandbox + evidências | eFe | prints/Network/order id | **PENDENTE** |
| α-E2E-2 | Frete no pedido coerente com política assinada | eFe | order.shipping_* / UI | **PENDENTE** |
| α-GATE-1 | Assinatura “Operação controlada OK” | eFe | [gate α](./FAL_ALPHA_GATE_2026-10-10.md) | PENDENTE |

### 3.2 Condicionais (só se D-FRETE = C)

| ID | Critério | Responsável | Status |
|----|----------|-------------|--------|
| α-FR-C1 | Secrets `CORREIOS_*` no Edge (humano) | eFe | N/A até C |
| α-FR-C2 | MARCHA HTTP Correios + testes | Agente (auth) | NÃO INICIADO |
| α-FR-C3 | `place_order` além de `mock:*` | Agente (auth) | NÃO INICIADO |
| α-FR-C4 | VAL frete PDP→pedido live | Agente+eFe | NÃO INICIADO |
| α-FR-C5 | MCP Correios local com credenciais | eFe | PENDENTE setup |

### 3.3 Se D-FRETE = A ou B (atalho α)

| ID | Critério | Nota |
|----|----------|------|
| α-FR-AB1 | UI mantém disclaimer; sem apresentar mock como frete real | Já no código |
| α-FR-AB2 | Produção `VITE_SHIPPING_PROVIDER=mock` (ou default) | Confirmar Netlify H5-análogo frete |
| α-FR-AB3 | Pedido E2E usa opção `mock:*` aceita pelo RPC | Obrigatório |

---

## 4. Sequência soberana de execução (ordem fixa)

```mermaid
flowchart TD
  S0[S0 Sync Netlify main] --> S1[S1 Assinar D-FRETE]
  S1 --> S2[S2 Smoke MP H1-H6]
  S2 --> S3{D-FRETE?}
  S3 -->|A ou B| S4[S4 E2E pedido mock frete + MP]
  S3 -->|C| S3a[S3a Auth MARCHA Correios live]
  S3a --> S3b[S3b place_order live]
  S3b --> S3c[S3c VAL frete]
  S3c --> S4c[S4c E2E pedido frete live + MP]
  S4 --> S5[S5 Assinar gate α]
  S4c --> S5
  S5 --> S6[S6 STOP α / abrir pós-α só com plano novo]
```

### S0 — Sync deploy (ops) — **PASS 2026-11-04**

| Passo | Ação | Done when |
|-------|------|-----------|
| S0.1 | Netlify → Trigger deploy da `main` (ou religar Git) | Novo `index-*.js` — **feito** `index-DYpbbWUS.js` |
| S0.2 | Hard refresh `/carrinho` | Link **Ver produto** visível |
| S0.3 | Confirmar catálogo + wtbp | Network `wtbpwuiayednvlhvuhbh` — **UP 04/11** |
| S0.4 | Registrar em E2E/prod status | [E2E sync 04/11](./FAL_E2E_PRODUCAO_STATUS_2026-10-10.md) |

**Não reabrir S0** sem finding (NXDOMAIN / bundle stale).

### S1 — D-FRETE (eFe) — **AGORA**

| Passo | Ação |
|-------|------|
| S1.1 | Escolher **B** na ficha (premissa α) |
| S1.2 | Preencher mensagem ao cliente + expedição |
| S1.3 | Se C (não α padrão): escrever “Próxima MARCHA: HTTP Correios + place_order” e autorizar |
| S1.4 | Assinar + data |

**Recomendação α (não assina pelo agente):** **B** para fechamento; C = pós-α salvo decisão formal.

### S2 — Mercado Pago smoke (eFe) — **AGORA (∥ S1)**

H1–H5 já **PASS** — executar [prep](./FAL_MP_SMOKE_PREP_2026-10-09.md) §3: H6 → Pix → cartão → webhook.  
Registrar em [MP status](./FAL_MP_SMOKE_STATUS_2026-10-10.md).

**Recheck visual no início do S2:** título **«Pagamento — Mercado Pago»** (não “simulado”).  
Apoio agente: só com auth explícita `SMOKE MP`.

| Paralelo | Permitido? |
|----------|------------|
| S1 ∥ S2 | **Sim** |
| S3a (Correios) antes de S1=C | **Não** |
| Agente secrets MP / vars Netlify | **Não** |

### S3 — Bifurcação frete

**A/B:** pular S3a–S3c; ir a S4 com mock.  
**C:** autorizar MARCHA técnica (escopo fechado abaixo).

#### Escopo MARCHA técnica se C (auth explícita)

Nome sugerido: `MARCHA_CORREIOS_LIVE_PLACE_ORDER`

| Fatia | Entrega | Aceite |
|-------|----------|--------|
| C.1 | HTTP na edge `quote-shipping` | Cotação real com secrets; 4xx/501 honestos |
| C.2 | Sem inventar peso/dims | `missing_logistics` se ausente |
| C.3 | RPC `place_order` opções live | Servidor valida valor; não confia FE |
| C.4 | Produção env alinhado | Provider correios live só após VAL |
| C.5 | VAL frete separado do MP | Doc VAL + evidências |
| C.6 | Unit/integração | Suite verde + smoke UI |

**Fora desta MARCHA:** Frenet live, carriers, PDP-ML, B3, Bloco F.

### S4 — E2E pedido pago (eFe)

| Passo | Esperado |
|-------|----------|
| Login cliente teste | OK |
| Catálogo → PDP → carrinho → checkout | OK |
| Frete conforme S1 | mock:* (A/B) ou live (C) |
| Pagamento Pix ou cartão sandbox | Approve / pending documentado |
| Pedido visível conta/admin | IDs + valores |
| Evidências anexadas | prints / Network (sem secrets) |
| Atualizar [E2E status](./FAL_E2E_PRODUCAO_STATUS_2026-10-10.md) | PASS parcial/total |

### S5 — Gate α (eFe)

Preencher bloco de aceite em [FAL_ALPHA_GATE](./FAL_ALPHA_GATE_2026-10-10.md):

```text
Operação controlada OK: SIM / NÃO / ACEITE DE RISCO
Data:
Assinatura:
Ressalvas (MP/frete/E2E):
```

### S6 — STOP α

Após S5=SIM (ou ACEITE DE RISCO documentado):

- Agente **não** abre F11 / PDP-ML / B3 / Bloco F / IMP-14 sem novo plano + auth.  
- Pós-α vira plano separado (§6).

---

## 5. Matriz RACI (α)

| Atividade | eFe | Agente | Netlify/Supabase |
|-----------|-----|--------|------------------|
| Deploy sync | A | C (detectar stale) | R |
| Secrets MP / Correios | A/R | — | C |
| Assinar D-FRETE | A/R | C (ficha) | — |
| Smoke MP | A/R | C (prep docs) | C |
| Código frete live | A (auth) | R | C |
| E2E pedido | A/R | C (VAL docs) | — |
| Gate α | A/R | C | — |

R=executa · A=aprova · C=consulta · —=fora

---

## 6. Fora da α (backlog pós-fechamento)

Só após S5. Cada item exige MARCHA + auth própria.

| ID | Item | Pri | Dependência |
|----|------|-----|-------------|
| Pα-01 | IMP-15 frete produção plena / multi-carrier | P1 | D-FRETE C + VAL |
| Pα-02 | IMP-14 pedidos/estoque profundos | P1 | Schema gap concreto |
| Pα-03 | Remover simulação enganosa se ainda residual | P1 | MP smoke PASS |
| Pα-04 | Fotos Storage em escala | P2 | Ops |
| Pα-05 | Bloco F RLS | P2 | Auth |
| Pα-06 | B3 migration repair | P2 | Auth explícita HOLD |
| Pα-07 | PDP estilo ML | P2 | Escopo dedicado |
| Pα-08 | Dashboard/relatórios F11+ | P3 | Roadmap |
| Pα-09 | Smoke staff admin (classif/apps/preços) | P2 | Humano |
| Pα-10 | Domínio custom / SSL / backups F10 ops | P2 | Infra eFe |

---

## 7. Riscos e mitigações (α)

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Netlify stale | UI “quebrada” falsa | S0 obrigatório antes de smoke UI |
| MP sem webhook | Approve manual/parcial | Documentar NÃO TESTÁVEL; não fingir PASS |
| D-FRETE C sem secrets | MARCHA travada | Não iniciar C.1 sem CORREIOS_* |
| Env correios + place_order mock | Checkout quebra | Guard `placeOrderReady` + prod em mock até C.3 |
| Aceite α sem E2E | Risco comercial | Gate exige α-E2E-1 ou ACEITE DE RISCO explícito |
| Escopo creep F11 | Atraso α | §6 só pós S5 |

---

## 8. Definição de pronto do **plano** (esta marcha soberana)

- [x] Documento único com sequência S0–S6  
- [x] Checklist α obrigatório + condicional C  
- [x] Bifurcação A/B vs C explícita  
- [x] Escopo MARCHA Correios live delimitado  
- [x] Pós-α listado e separado  
- [x] RACI + riscos  
- [x] Links para docs canônicos  
- [x] Sync molde + gate α apontando este plano  

**Esta marcha NÃO implementa** HTTP Correios, secrets, E2E pago nem assinaturas.

---

## 9. Encerramento / STOP

1. **Planejamento α finalizado** neste arquivo.  
2. **Próxima ação humana imediata:** S0 (deploy) + S1 (D-FRETE) ∥ S2 (MP).  
3. **Próxima MARCHA agente de código:** somente após S1=C + auth, ou bugs/regressões com evidência.  
4. **STOP agente** para features α novas sem gate.

```text
PLANO SOBERANO α: FECHADO COMO DOCUMENTO
EXECUÇÃO α: ABERTA (humano)
```
