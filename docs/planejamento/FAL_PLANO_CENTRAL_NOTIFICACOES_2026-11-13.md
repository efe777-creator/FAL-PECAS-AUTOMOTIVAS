# Plano — Central de Notificações FAL (CP-NOT)

**Versão:** V1 · **Data:** 2026-11-13  
**Status:** N0–N2 + N5 parcial + **N6 estrutural MARCHA** · gate humano 1 jornada · WA = FUTURO  
**Auth:** eFe  
**Auditoria:** [FAL_AUDITORIA_NOTIFICACOES_2026-11-13.md](./FAL_AUDITORIA_NOTIFICACOES_2026-11-13.md)  
**Spec:** [FAL_SPEC_CENTRAL_NOTIFICACOES_2026-11-13.md](./FAL_SPEC_CENTRAL_NOTIFICACOES_2026-11-13.md)  
**WhatsApp futuro:** [FAL_SPEC_NOTIFICACOES_WHATSAPP_FUTURO_2026-11-13.md](./FAL_SPEC_NOTIFICACOES_WHATSAPP_FUTURO_2026-11-13.md)  
**VAL N1:** [FAL_MARCHA_NOTIFICACOES_N1_UX_SININHO_VAL_2026-11-13.md](./FAL_MARCHA_NOTIFICACOES_N1_UX_SININHO_VAL_2026-11-13.md)  
**VAL N2:** [FAL_MARCHA_NOTIFICACOES_N2_MOTOR_VAL_2026-11-13.md](./FAL_MARCHA_NOTIFICACOES_N2_MOTOR_VAL_2026-11-13.md)  
**VAL N5:** [FAL_MARCHA_NOTIFICACOES_N5_ADMIN_PARCIAL_VAL_2026-11-13.md](./FAL_MARCHA_NOTIFICACOES_N5_ADMIN_PARCIAL_VAL_2026-11-13.md)  
**VAL N6:** [FAL_MARCHA_NOTIFICACOES_N6_HOMOLOG_VAL_2026-11-13.md](./FAL_MARCHA_NOTIFICACOES_N6_HOMOLOG_VAL_2026-11-13.md)  
**Programa:** [FAL_PLANO_CENTRAL_PEDIDOS_4_FRENTES_2026-11-11.md](./FAL_PLANO_CENTRAL_PEDIDOS_4_FRENTES_2026-11-11.md) (frente transversal P2 — **não** renumerar as 4 fases)

---

## 0. Acompanhamento

| Onda | Objetivo | Estado |
|------|----------|--------|
| N0 | Auditoria + spec + encaixe mestre | **Gate 0 MARCHA** |
| N1 | UX sininho + Central in-app | **Código MARCHA** · smoke humano no N6 |
| N2 | Motor / outbox / deliveries | **Código + SQL MARCHA** · smoke humano no N6 |
| N3 | WhatsApp | **MARCHA FUTURO** — spec travada; execução só com **MARCHA N3** + gate provedor |
| N4 | E-mail | Futuro (após N3 ou MARCHA N4) |
| N5 | Admin config | **Parcial MARCHA** (histórico/canais/catálogo/reprocess; sem editar mandatory) |
| N6 | Homologação NOT-01..10 + UX | **SMOKE PASS** ([VAL SMOKE](./FAL_MARCHA_NOTIFICACOES_N6_SMOKE_VAL_2026-11-13.md)) · fix dual-role |

---

## 1. Visão

Motor único: `order_events` → decide quem / canal / conteúdo → inbox + (futuro) WhatsApp/e-mail.

Inbox A/C7 **preservado** e evoluído; sem reimplementar fanout em Checkout/Central/Logística.

---

## 2. Ondas

### N0 — Auditoria (FEITO)

- Matriz CP-NOT
- Spec motor + UX
- Links no plano/mapa Central e Fases A/C

### N1 — Central in-app + sininho

**Objetivo:** acesso fácil na jornada cliente e operador.

| Item | Ação |
|------|------|
| Ícone | Trocar `NT` por **sino** em `NotificationBell` |
| Header loja | Inserir bell quando autenticado (desktop + drawer) em `Header.tsx` |
| Conta / Admin | Manter bell; mesmo componente |
| Badge | Não lidas |
| Dropdown | Últimos + Ver todos → `/conta/avisos` ou `/admin/avisos` |
| Ação necessária | Destaque visual + deep-link decisão |
| Filtros | Tipo / situação / não lidas na Central |
| Atualização | Poll ≤ 30s ou Realtime Supabase |
| Copy | Alinhar títulos “Ação necessária” nos kinds de decisão |

**Aceite N1:** NOT-UX-01..05 + NOT-04 + NOT-05 + NOT-06 (parcial se âncora) + NOT-10 (inbox).

**Fora N1:** WhatsApp, e-mail, admin templates, delivery table (podem ser stubs na spec).

### N2 — Motor

- Catálogo kinds × audience × severity
- `notification_deliveries` + idempotência cross-canal
- Fechar gaps staff do brief **somente** com `order_events` reais
- Reprocessamento seguro; falhas rastreáveis (NOT-09)
- Mandatory flags para pagamento / aprovação / segurança

### N3 — WhatsApp (**FUTURO** — eFe 2026-11-13)

Contrato: [FAL_SPEC_NOTIFICACOES_WHATSAPP_FUTURO_2026-11-13.md](./FAL_SPEC_NOTIFICACOES_WHATSAPP_FUTURO_2026-11-13.md).

- **Agora:** não integrar API; manter só `wa.me` manual; canal reservado em deliveries/CHECK.
- **Quando MARCHA N3:** provider + templates + outbox `whatsapp` + preferências + NOT-07.
- Gate: smokes N1/N2 + conta Business + templates + telefone cliente + flag canal on.

### N4 — E-mail

- Modelos formais + mesmo outbox
- NOT-08

### N5 — Admin config

**Parcial (MARCHA 2026-11-13):**
- `/admin/avisos` — abas inbox · histórico `notification_deliveries` · canais + catálogo (leitura)
- Reprocess `failed`/`skipped` in_app
- Sem toggle WhatsApp; sem editar templates/mandatory

**Restante N5:** editar modelos, destinatários internos, ligar canais com gate.

### N6 — Homologação

- Jornada cliente + operador ponta a ponta
- Matriz NOT-01..10 + NOT-UX
- VAL dedicado `FAL_MARCHA_NOTIFICACOES_*_VAL`

---

## 3. Critérios de aceite

| ID | Garantia |
|----|----------|
| NOT-01 | Evento correto gera notificação |
| NOT-02 | Destinatário correto |
| NOT-03 | Sem duplicidade |
| NOT-04 | Leitura / não leitura |
| NOT-05 | Link abre pedido correto |
| NOT-06 | Aprovação permite resposta |
| NOT-07 | WhatsApp registra status |
| NOT-08 | E-mail registra status |
| NOT-09 | Falhas rastreáveis |
| NOT-10 | Histórico completo |
| NOT-UX-01 | Sininho no header loja (logado) |
| NOT-UX-02 | Sininho no admin em todas as telas |
| NOT-UX-03 | Ícone sino + badge |
| NOT-UX-04 | Dropdown + Ver todos |
| NOT-UX-05 | Ação necessária → decisão |

---

## 4. Ordem de marcha

1. N0–N2 + N5 parcial + N6 estrutural — **feitos**  
2. Fechar checklist humano do [VAL N6](./FAL_MARCHA_NOTIFICACOES_N6_HOMOLOG_VAL_2026-11-13.md) (1 jornada real)  
3. **WhatsApp:** só **MARCHA N3** explícita  
4. E-mail N4  

---

## 5. Relação com outras frentes

| Frente | Relação |
|--------|---------|
| Central 4 fases | CP-NOT = P2 transversal; testes `CP-T-NOT-*` na Fase 3 quando aplicável |
| Fase A | Inbox decisão = baseline; CP-NOT evolui UX |
| Fase C7 | Inbox rastreio = baseline |
| AJUSTE 032 | Atendimento ≠ transporte de notificação |

---

## 6. Assinaturas

| Gate | Data | Auth |
|------|------|------|
| Gate 0 (docs) | 2026-11-13 | eFe · **MARCHA** |
| Gate N1 (código) | 2026-11-13 | eFe · **MARCHA** · VAL smoke humano aberto |
| Gate N2 (motor) | 2026-11-13 | eFe · **MARCHA** · migration prod + VAL smoke aberto |
| Gate N3 (WhatsApp) | 2026-11-13 | eFe · **MARCHA FUTURO** — spec; execução pendente |
| Gate N5 parcial | 2026-11-13 | eFe · **MARCHA** — admin histórico/canais |
| Gate N6 estrutural | 2026-11-13 | eFe · **MARCHA** — SQL+tests PASS |
| Gate N6 SMOKE | 2026-11-13 | eFe · **MARCHA SMOKE** — PASS + unique audience |
