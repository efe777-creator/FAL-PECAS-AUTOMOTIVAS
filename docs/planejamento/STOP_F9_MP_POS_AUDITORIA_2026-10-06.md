# STOP — F9 Mercado Pago (pós-encaixe docs)

**Data:** 2026-10-06  
**Branch:** `plan`

## Feito

Documentação de encaixe no roadmap real (sem código MP):

- Adendo Plano Mestre
- Auditoria arquitetura checkout/pedido/pagamento
- Especificação Mercado Pago
- Checklist
- Sync INTEGRACOES / INICIALIZACAO / ROADMAP / STATUS / AUDITORIA_GIT

## Proibido até MARCHA explícita pós-revisão

- Migrations F9 / `db push` / `db repair`
- Edge Functions MP
- `@mercadopago/sdk-react` ou SDK server
- Alterar `place_order` / inventário / ciclo F7
- Credenciais no git / `VITE_*` com Access Token

## Próximo

Revisão humana → `MARCHA` = F9-A **impl** (migrations + RLS + layout secrets) conforme checklist.
