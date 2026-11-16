# FAL — Auditoria consolidada para PRD 4.0

**Data:** 2026-11-16  
**Status:** CANÔNICO (evidência para PRD 4.0)  
**Modo:** somente leitura / consolidação documental  
**Baseline tip:** `4e7fab19` (`main`)  
**Working tree:** sujo (pay Asaas cartão, condição %, notificações mobile — não commitados no tip)

Legenda: **FATO** · **HIPÓTESE** · **NÃO VERIFICADO**

Documentos derivados: [FAL_PRD_4.0.md](../entrada/FAL_PRD_4.0.md) · [FAL_MVP_COMPLETO_4.0.md](./FAL_MVP_COMPLETO_4.0.md) · [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md) (**execução assertiva P0–G8**)

---

## 1. Resumo executivo

A FAL já é um **commerce operacional amplo** (loja + admin + pedidos + frete + pay híbrido + INV aditivo + notificações). O problema central não é “falta de telas”; é **governança e coerência**:

- canais paralelos e espelhos de dados;
- docs e planos fragmentados;
- working tree / tip / produção desalinhados em pagamento;
- G8 (venda plena) ainda aberto apesar de “MVP código” avançado.

**Veredito:** preservar fundações (`place_order`, PVC, `resolve_product_price`, INV aditivo, hub de pedidos, `paymentRouter`); ajustar remendos; completar gates operacionais; preparar slots futuros sem implementar Parceiros/Workshop agora.

---

## 2. Baseline

| Item | Valor |
|------|--------|
| Stack | React 19 + Vite 8 + TypeScript + Tailwind 4 + Supabase + Netlify |
| App | `fal-pecas/` |
| Rotas | ~70 em `fal-pecas/src/app/router.tsx` |
| Migrations | ~145 em `fal-pecas/supabase/migrations` |
| Edge Functions | plate-lookup, interpret-search-nl, quote-shipping, quote-own-delivery, melhorenvio-*, create-fal-payment, create-mp-payment, create-asaas-payment, pay-asaas-credit-card (WT), webhooks, sync-* |
| Testes | Vitest amplo (pay/frete/INV); sem E2E browser oficial no pacote |
| Types DB gerados | Ausentes no repo (**NÃO VERIFICADO** remoto) |

### Integrações (nomes de config, sem segredos)

`VITE_SUPABASE_*`, `VITE_PAYMENT_PROVIDER`, `MP_*`, `ASAAS_*`, Melhor Envio via Edge, placa via Edge.

---

## 3. Inventário de telas (síntese)

### Loja

| Cluster | Rotas | Estado |
|---------|-------|--------|
| Descoberta | `/`, `/catalogo`, `/produto/:slug`, `/veiculo` | Implementado; busca melhorou com NL |
| Compra | `/carrinho`, `/checkout`, `/pedido/:id/confirmacao` | Checkout auth; remendas pay/frete |
| Conta | `/conta/*` (perfil, endereços, veículos, favoritos, pedidos, avisos) | Seed Garage em `/conta/veiculos` |
| Auth/legal | login, cadastro, senha, termos, privacidade, trocas | Páginas legais existem; RMA operacional ausente |

### Admin

| Cluster | Rotas | Estado |
|---------|-------|--------|
| Catálogo | produtos, apps, preços, imports, categorias, home, busca, veículos, marcas, fornecedores | Amplo; `/admin/busca` fora do sidebar |
| Pedidos | hub, áreas, visões, detalhe | Flui (RPCs) |
| Ops | estoque, logística, pagamentos, clientes, avisos, relatórios, operadores | Implementado |

### Gaps / órfãos (FATO)

- `/admin/busca` sem item no sidebar  
- `/veiculo` (guest) vs `/conta/veiculos` (auth) — papéis distintos, nav misturada  
- Órfãos: `AdminPlaceholderPage`, `OrdersPage`, `AccountPage` deprecated  

---

## 4. Dados e fontes de verdade

| Domínio | Fonte de verdade | Espelho / risco |
|---------|------------------|-----------------|
| Produto | `products` | — |
| Fitment | `product_vehicle_compatibility` (`year_start`/`year_end`) | `vehicle_versions.year` legado |
| Identidade veículo | `manufacturers` / `models` / `vehicle_versions` | `vehicle_aliases`, `cached_plates` |
| Preço | RPC `resolve_product_price(s)` | `products.price` / `promo_price` sync |
| Estoque | `inventory` | `products.is_available` trigger |
| Pedido | `orders` / `order_items` via `place_order` | snapshots |
| Pagamento | `payments` + Edges + webhooks | stub no `place_order` |
| Frete | `shipping_quotes` → order/shipment | ME packing ≠ POL own |
| Garagem seed | `customer_vehicles` | exige `version_id` |
| Notificações | `app_notifications` | deliveries / preferences |

---

## 5. Jornadas A–H

| Jornada | Fluidez | Evidência-chave |
|---------|---------|-----------------|
| A Descoberta | **FLUI** | NL + placa + seletor; estoque não vem da RPC de busca |
| B Compra | **REMENDA** | Revalida frete; % condição WT pode falhar silenciosa |
| C Pagamento | **REMENDA** | Router híbrido OK; cartão embutido WT; Asaas pode estar off |
| D Processamento | **FLUI** | Análise/separação por RPC |
| E Entrega | **REMENDA** | Label ≠ enviado; gates ME/own |
| F Pós-venda | **TRAVA** (RMA) | Cancel/confirm OK; trocas = página legal |
| G Admin | **FLUI** | Superfície ampla |
| H Atendimento | **REMENDA** | Inbox real; UI mobile WT; WA futuro |

---

## 6. Domínios críticos

### Pay híbrido (FATO — regra no código)

- PIX ≤ R$ 201 → Mercado Pago  
- PIX > R$ 201 → Asaas  
- Cartão → Asaas  
- Boleto → Asaas no router; **fora do checkout**  

Riscos: `asaas_enabled` default false; WT cartão/condição não alinhado tip/prod.

### Frete

- Carrinho como conjunto via menor caixa (`shipping_box_templates`)  
- Packing físico ≠ POL  
- Own provisional não entra em `place_order`  

### INV

- Aditivo sobre mestre; não substitui PVC  
- Garagem seed já existe  

---

## 7. Achados P0–P4

### P0

| ID | Título | Tipo | Ação |
|----|--------|------|------|
| P0-1 | Alinhar WT pay + migração + Edges + Netlify | FATO | Completar |
| P0-2 | Asaas habilitado em produção | HIPÓTESE/ops | Confirmar |
| P0-3 | Smoke G3 approve/recusa/duplicado | NÃO VERIFICADO | Completar |
| P0-4 | G4 etiqueta → ship → rastreio | FATO parcial | Completar |

### P1

| ID | Título | Ação |
|----|--------|------|
| P1-1 | Massa PVC / fitment confiável | Completar |
| P1-2 | Dimensões + packing ME | Completar |
| P1-3 | Estoque bloqueando compra no modo certo | Completar |
| P1-4 | Pós-venda mínimo além do legal | Completar |
| P1-5 | Docs direcionadores desatualizados | Completar (este programa) |

### P2–P4

| ID | Título | Ação |
|----|--------|------|
| P2-1 | `vehicle=1` morto / órfãos de página | Ajustar |
| P2-2 | Unificar create Asaas | Ajustar |
| P2-3 | `/admin/busca` no nav | Ajustar |
| P3-1 | UX 3 estados de compatibilidade | Preparar/adiar fino |
| P4-1 | Garage rica / Parceiros / WA agentic | Adiar |

---

## 8. Matriz preservar / ajustar / completar / preparar / adiar / não fazer

| Item | Decisão |
|------|---------|
| `place_order` único | Preservar |
| PVC + INV aditivo | Preservar |
| `resolve_product_price` | Preservar |
| Hub pedidos / RPCs transição | Preservar |
| `paymentRouter` híbrido | Preservar |
| `customer_vehicles` seed | Preservar |
| Preço espelho vs RPC | Ajustar |
| Canais busca (NL já une) | Preservar direção; completar dados |
| `vehicle=1` | Ajustar |
| Dois paths create Asaas | Ajustar |
| Pay WT + flags + smoke | Completar |
| Frete shippable + dims | Completar |
| G8 E2E humano | Completar |
| Identidade/orgs futuras | Preparar (docs only) |
| Garage rica | Adiar |
| Parceiros / Workshop / split | Adiar / não fazer agora |
| Boleto checkout | Adiar |
| Microsserviços | Não fazer |
| Rebuild do zero | Não fazer |

---

## 9. O que temos × o que falta para MVP

### Temos

- Loja e admin cobrindo funil commerce  
- Pedido, pagamento (código), frete (código), estoque UI, INV seed, notificações inbox  
- Princípios corretos no PRD antigo (fonte de verdade, evolução controlada)  

### Falta para MVP (Commerce G8 + Garage seed)

- Alinhamento operacional pay/frete  
- Evidências humanas G1–G8  
- Coerência de dados (apps, medidas)  
- Pós-venda mínimo operacional  
- Documentação canônica (PRD 4.0 + MVP + arquitetura)  

### Não falta para MVP

- Marketplace de oficinas  
- OS digital  
- Portal fornecedor  
- App nativo  
- WhatsApp agentic  

---

## 10. Limitações desta consolidação

- SQL live / drift prod schema: **NÃO VERIFICADO** neste documento (herda auditorias anteriores).  
- Smoke financeiro real: **NÃO VERIFICADO**.  
- Browser E2E completo: **NÃO VERIFICADO**.  
- RLS linha a linha: **NÃO VERIFICADO** além do nomeado em migrations.  

---

## 11. Fontes reconciliadas

- Auditoria profunda 2026-11-16 (telas, schema, jornadas, pay, frete, INV)  
- [FAL_AUDITORIA_ARQUITETURA_BUSCA_V1.md](./FAL_AUDITORIA_ARQUITETURA_BUSCA_V1.md)  
- [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
- [FAL_INV_CHARTER_V1.md](./FAL_INV_CHARTER_V1.md)  
- [FAL_PAY_ARQUITETURA_HIBRIDA_ASAAS_MERCADO_PAGO.md](./FAL_PAY_ARQUITETURA_HIBRIDA_ASAAS_MERCADO_PAGO.md)  
- Visão estratégica eFe (chat 2026-11-16) — formalizada em [FAL_VISAO_ECOSSISTEMA_2040.md](../entrada/FAL_VISAO_ECOSSISTEMA_2040.md)  
