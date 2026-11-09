# Plano mestre — Gestão de pagamentos e integrações da FAL

**Data:** 2026-11-09  
**Status:** PG01–PG04 feitos · **PG05–PG11b implementados localmente** (2026-11-09) · PG12–PG18 / multi-gateway ainda futuros  
**Refs:** [handoff conta nova](./FAL_MARCHA_OPS_MP_ME_CONTA_NOVA_HANDOFF_2026-11-09.md) · [auditoria PG01](./FAL_AUDITORIA_PAGAMENTOS_PG01_2026-11-09.md) · [VAL gestão](./FAL_MARCHA_PAGAMENTOS_ONDA_GESTAO_VAL_2026-11-09.md)

---

## Diretriz

A FAL controla a integração. Mercado Pago é o **primeiro** provedor, não dependência definitiva.  
Pedidos e histórico financeiro pertencem à FAL. Credenciais só no backend.

## Arquitetura (4 camadas)

Checkout FAL → Motor de pagamentos FAL → Adaptadores (MP agora · futuros depois) → Pedidos/Financeiro.  
Admin Pagamentos configura o motor; não bypassa o checkout.

## Menu Admin → Pagamentos (próxima onda)

Visão geral · Provedores · **Métodos de pagamento** · Configurações · Transações · Reembolsos · Webhooks · Monitoramento · Relatórios · Auditoria

### Métodos de pagamento → Mercado Pago (PG11b)

Rota: `/admin/pagamentos/metodos/mercado-pago`

Controla (sem expor secrets): ambiente test/prod · status API · flags de credenciais · métodos Pix/crédito/débito · opções Pix · opções cartão alinhadas a `store_payment_display` · webhook URL/status · manutenção (pausar cobranças).

Checkout fala com o **motor**; esta tela configura o **adaptador MP**.

## Backlog

| ID | Entrega | Onda |
|----|---------|------|
| PG01–PG04 | Auditoria, vars, handoff, env-driven | **Feita** |
| PG05 | Contrato interno do motor | **Feita** |
| PG06 | Adaptador Mercado Pago explícito | **Feita** |
| PG07 | Padronização de estados (TS + map persistência) | **Feita** |
| PG08 | Modelo transações/eventos (doc, sem tabelas novas) | **Feita** |
| PG09–PG11 | Menu + provedores + métodos | **Feita** |
| **PG11b** | **Tela Métodos → Mercado Pago** | **Feita** |
| PG12–PG18 | Configs DB, webhooks UI, refunds, monitor, permissões | Pendente |
| PG19–PG22 | Multi-gateway / substituição | Posterior |

Ordem: **PG05 → PG07 → PG06/PG08 → PG09–PG11 → PG11b → PG12–PG18**.

## Integrações (visão)

Admin → Integrações: **Pagamentos** | **Logística** (ME). Pedido FAL conecta os dois.

## Não fazer agora

Trocar MP · segundo gateway · secrets/deploy produção · Evolução 1 frete · sistema financeiro paralelo · duplicar `payments`/`payment_events`.

**Assinatura:** Spec plano mestre Pagamentos · 2026-11-09.
