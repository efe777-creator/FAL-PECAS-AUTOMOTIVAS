# Prep — Contratos reutilizáveis para agentes de IA (futuro)

**Data:** 2026-11-16 · **Status:** FUTURO / fundação documental  
**Não autoriza** bot WhatsApp, Agent SDK no produto nem AI Gateway agora.  
**Cruzamento:** [FAL_INTELLIGENCE_VISAO_FUNCIONAL.md](./FAL_INTELLIGENCE_VISAO_FUNCIONAL.md) · PRD 4.0 §1.4 / §3.9 / §6.6 · Spec N3 WA

## Princípio

A IA **consulta** SoT FAL e declara insuficiência.  
Ações mutáveis (`place_order`, cancel, pay) só com **gates** explícitos.  
**Proibido:** segundo CRM, segundo canal de compra, inventar fitment/preço/estoque.

## Mapa tool → contrato existente

| Intenção do usuário | Tool / contrato a reusar | Onde vive |
|---------------------|--------------------------|-----------|
| Buscar peça / NL | `searchCatalog` + `interpret-search-nl` / `interpretSearchQuery` | Edge + `searchService` |
| Identificar veículo / placa | `resolveVehicleIdentity` / `plate-lookup` | Edges + INV |
| Preço | `resolve_product_price(s)` | SQL + pricing service |
| Estoque / disponibilidade | `inventory` + modo loja | Domínio estoque |
| Status do pedido | pedidos cliente / admin (mesmas queries) | `orderDetailService` / admin orders |
| Criar pedido | **somente** `place_order` | RPC única |
| Pagamento | Edges MP/Asaas + `payments` | FAL PAY híbrido |
| Frete | `quote-shipping` / own / ME | shipping services |
| Handoff humano | `wa.me` + Central de Pedidos + inbox `app_notifications` | `whatsapp.ts` / admin |

## Identidade do cliente (pré-req futuro)

- Telefone normalizado no perfil (`phone.ts` / AccountProfile) — E.164 quando N3/agente.
- Opt-in de canal (notif + marketing) separado do essencial da loja.
- Atribuição de origem do pedido: `orders.attribution` (prep Ads; reutilizável como “canal de entrada”).

## Gates obrigatórios (quando houver MARCHA de agente)

1. Consulta livre (catálogo/status) com dados reais.  
2. Sugestão de peça/pedido **sem** cobrança automática.  
3. `place_order` / pay / cancel só após confirmação do cliente **ou** política staff.  
4. Handoff: “Falar com alguém” → humano com histórico.  
5. Spec por caso de uso (não “bot genérico”) — Intelligence §6.

## Explicitamente adiado (não construir nesta prep)

| Item | Motivo / quando |
|------|-----------------|
| GTM / GA4 / Meta Pixel **live** | Fase 6 + IDs + consent marketing |
| CAPI / Enhanced Conversions | Após Pixel client OK |
| WhatsApp N3 (templates + worker) | Spec N3 + conta Business |
| Bot / Agent SDK / Netlify AI Gateway no app | Fase 10 Intelligence |
| Inbox omnichannel / segundo CRM | Anti-remendo PRD |
| BI / série temporal / Painel híbrido | Ciclos de dados/UX separados |
| Fees gateway / CMV histórico congelado | Pós-MVP financeiro |

## Fundação já entregue nesta prep (código)

- Consent marketing estruturado (`cookieNotice` v2)  
- Facade `analytics.ts` + hooks do funil (no-op sem ID/consent)  
- Atribuição no `place_order` → `orders.attribution`  
- Placeholders env Ads · OG helper · copy privacidade  
