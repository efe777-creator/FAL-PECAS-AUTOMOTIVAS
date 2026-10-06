# Checklist Fase 9 — Pagamentos Mercado Pago

**Baseline docs:** 2026-10-06 · **F9-A + F9-B DONE** (`main` `06be4e4`) · STOP antes F9-C  
**Refs:** [ESPECIFICACAO…](./ESPECIFICACAO_FASE9_PAGAMENTOS_MERCADO_PAGO.md) · [AUDITORIA_F9B…](./AUDITORIA_F9B_PRE_IMPL_2026-10-06.md)

---

## Planejamento

- [x] Adendo Plano Mestre (F8.5/F9.0 DONE; F9=MP; F8.6–8.8 paralelo; F10 frete)
- [x] Auditoria arquitetura checkout/pedido/pagamento
- [x] Especificação Mercado Pago
- [x] Este checklist
- [x] Sync ESPECIFICACAO_FASE9_INTEGRACOES + PLANO_INICIALIZACAO_F9
- [x] MARCHA → F9-A impl
- [x] MARCHA → F9-B create payment

---

## F9-A impl — Fundação

- [x] Migration estende `payments` (`20261006200000`)
- [x] Migration cria `payment_events` + unique evento
- [x] Estados internos documentados no SQL/CHECK
- [x] RLS: customer não aprova payment (revoke write authenticated)
- [x] Secrets layout documentado em `.env.example` (sem valores)
- [x] Feature flag / `VITE_PAYMENT_PROVIDER` + `VITE_MP_PUBLIC_KEY` planejados
- [x] Sem alteração indevida em `place_order` / inventário
- [x] Apply linked + histórico `schema_migrations`
- [x] PR #5 MERGED

---

## F9-B — MP Sandbox

- [x] Auditoria F9-A + docs oficiais MP ([AUDITORIA_F9B…](./AUDITORIA_F9B_PRE_IMPL_2026-10-06.md))
- [x] Edge `create-mp-payment` (amount = `orders.total`, sem aprovar pedido)
- [x] Access Token só backend (`MP_ACCESS_TOKEN` secret — deploy manual)
- [x] Public Key layout no FE (`.env.example`)
- [x] `X-Idempotency-Key` = `fal-pay-{paymentId}`
- [ ] Credenciais TEST configuradas no projeto Supabase (humano)
- [x] PR #6 MERGED (`06be4e4`)

---

## F9-C — Pix

- [ ] Criar cobrança Pix
- [ ] QR Code + copia-e-cola
- [ ] Expiração
- [ ] Webhook mínimo → pending/approved
- [ ] UI pendente (sem “pago” no FE)

---

## F9-D — Cartões

- [ ] Card Payment Brick
- [ ] Crédito + parcelas
- [ ] Débito se disponível na conta
- [ ] Sem PAN/CVV na FAL
- [ ] Aprovado / rejeitado

---

## F9-E — Webhook + concurrency

- [ ] Validação `x-signature` / HMAC
- [ ] Evento duplicado = no-op
- [ ] Consulta MP + valida amount + order
- [ ] Fora de ordem tratado
- [ ] Logs sem secrets/PAN

---

## F9-F — Checkout FAL

- [ ] Fluxo carrinho→pedido→pagamento→confirmação
- [ ] Amount só do backend
- [ ] Poll/consulta status
- [ ] Simulado ainda disponível se flag off

---

## F9-G — Admin

- [ ] Painel pagamento no pedido
- [ ] IDs externos / método / status / datas
- [ ] Eventos básicos

---

## F9-H — Homologação

### Pix
- [ ] gerar cobrança · QR · copiar · expiração · webhook · aprovação · pedido atualizado

### Crédito
- [ ] Brick · tokenizar · parcelas · aprovado · rejeitado

### Débito
- [ ] disponível quando habilitado · processar

### Segurança
- [ ] Access Token backend · Public Key FE · secrets · webhook validado · RLS · sem cartão armazenado · idempotência

### Pedido
- [ ] pending não confirma · approved confirma ciclo F7 · rejected não confirma · duplicidade · amount validado

### Regressão
- [ ] F7 · F8 · estoque · pedidos legados · catálogo · listas preço · build/test PASS

---

## F9-I — Produção (auth humana)

- [ ] Credenciais PROD
- [ ] Webhook HTTPS
- [ ] Smoke produção
- [ ] Rollback documentado
- [ ] Monitoramento mínimo

---

## Fora deste checklist

- F8.6 / F8.7 / F8.8 (backlog paralelo)
- F10 frete real
- Refund automático
- Repair migrations em massa
