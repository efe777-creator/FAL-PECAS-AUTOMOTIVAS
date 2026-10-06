# Especificação Fase 9 — Integrações + qualidade

**Status:** F9-A + **F9-B DONE** em `main` (`ede8acf`). F9-C…E abertas.  
**Base:** [ROADMAP_FASES_3.0.md](./ROADMAP_FASES_3.0.md) § Fase 9 · [PLANO_INICIALIZACAO_F9…](./PLANO_INICIALIZACAO_F9_2026-10-06.md)  
**Princípio F6:** checkout e admin continuam falando com **contratos internos FAL**; F9 troca **adapters**, não redesenha fluxos.

---

## 1. Objetivo

Conectar **pagamento real** e **frete/transportadoras reais** ao e-commerce F6, endurecer qualidade (testes, observabilidade, segurança operacional), mantendo F7 operação de pedidos e F8 modos de estoque intactos.

---

## 2. Escopo in

| Área | Entrega |
|------|---------|
| Pagamento | Adapter de gateway real implementando `PaymentProvider` (substituir/sim complementar simulado) |
| Frete | Implementar `ShippingProvider`: Correios, Frenet, transportadora própria (`carrier`) — stubs hoje em `fal-pecas/src/services/shipping/providers/*` |
| Config | Secrets via env/Supabase vault; sandbox vs produção documentados |
| Checkout | Zero mudança de UX de contrato: `quoteShipping`, `placeOrder`, confirmação de pagamento |
| Qualidade | Suíte mínima E2E/live para cotação + webhook/callback pagamento; monitoramento básico |
| Runbook migrations | Documentar playbook pós-R1: disco 31 SQL vs ledger 74 (repair/fetch) para novos clones |

## 3. Escopo out

- WMS, multi-depósito, PIM, ERP (F8.1+ roadmap)
- Reescrever F7/F8 ou checkout
- Guest checkout (se não priorizado no roadmap)

---

## 3. Contratos existentes (não quebrar)

- **Frete:** `shippingService` + `ShippingProvider` — [shippingService.ts](../../fal-pecas/src/services/shipping/shippingService.ts)
- **Pagamento:** adapter simulado F6 — substituir implementação, manter interface consumida pelo checkout
- **Pedido:** `place_order`, ciclo F7 inalterado

---

## 4. Fatias sugeridas (ordem)

1. **F9-A — Frete Correios (sandbox)** — **DONE** — cotação PAC/SEDEX; `VITE_SHIPPING_PROVIDER=correios`; testes unitários PASS
2. **F9-B — Frenet ou agregador** — **DONE** — multi-transportadora sandbox; `VITE_SHIPPING_PROVIDER=frenet`
3. **F9-C — Pagamento gateway** — criar pedido + confirmar pagamento; mapear para `confirm_simulated_payment` ou RPC dedicada com mesmo efeito no ciclo F7
4. **F9-D — Observabilidade** — logs estruturados, alertas falha cotação/pagamento
5. **F9-E — Testes live** — checklist checkout + pedido pago em sandbox

---

## 5. Critérios de saída (Fase 9)

- [x] Checkout produz cotações reais (≥1 provider) em sandbox — **F9-A Correios + F9-B Frenet**
- [ ] Pagamento sandbox completa ciclo até status compatível com F7 (confirmação)
- [x] Adapters isolados — troca de provider sem alterar páginas checkout — **via `VITE_SHIPPING_PROVIDER` / `setShippingProvider`**
- [ ] Documentação de env vars e rotação de secrets
- [ ] Regressão F7/F8 smoke mínima PASS pós-integração pagamento

---

## 6. Dependências

- **F8.4** + **F8.5 Opção A** + P1 em `main` (`762c697`).
- **Apply migration F8.5** feito + histórico `schema_migrations` registrado.
- Contas sandbox: Correios/Frenet/gateway (credenciais eFe) — para HTTP real / F9-B+.
- Supabase: possíveis migrations leves (webhook secrets, payment_attempts) — gate separado.

---

## 7. Riscos

| Risco | Mitigação |
|-------|-----------|
| Drift migrations 31 vs 74 em clone novo | Runbook repair/fetch; não versionar 43 MCP (decisão R1) |
| Webhook pagamento fora de ordem | Idempotência + ledger payment_status |
| Cotação lenta no checkout | Timeout, fallback mensagem, cache curto CEP |

---

## 8. Próximo passo

Abrir **F9-C** (gateway pagamento) com MARCHA. Não implementar F9-D…E até F9-C.
