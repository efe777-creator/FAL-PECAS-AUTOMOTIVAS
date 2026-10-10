# FAL 3.0 — Auditoria técnica de frete, cotação e experiência de entrega

**Data:** 2026-10-10  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Tipo:** MARCHA DE AUDITORIA (+ estrutura plugável autorizada na mesma marcha)  
**Loja:** https://fal-pecas-automotivas.netlify.app

---

## A. Resumo executivo

O frete hoje é **checkout-centric**: cotação só em `CheckoutPage` via `quoteFreight` → providers client-side. **PDP e carrinho não consultam CEP**. O pedido (`place_order`) ainda resolve frete **somente** com `resolve_mock_shipping_option` (`mock:*`). Correios/Frenet no código são **sandbox local sem HTTP** — não são produção. Não há edge de frete em produção; foi criado o esqueleto `quote-shipping`. Lacuna logística: colunas `weight_kg` / dimensões existem; checkout **não envia** peso/dimensões nos items da cotação. Impacto na 1ª venda: sem D-FRETE C + integração live + alinhamento RPC, não se pode apresentar frete Correios como comercialmente real.

---

## B. Inventário técnico

| Arquivo | Responsabilidade | Comportamento atual | Evidência |
|---------|------------------|---------------------|-----------|
| `fal-pecas/src/pages/Product/ProductPage.tsx` | PDP | `ProductShippingQuoteBlock` (CEP + envelope) | FATO — pós-estrutura 10/10 |
| `.../ProductShippingQuoteBlock.tsx` | UI Entrega PDP | Consulta via envelope + disclaimer | FATO (novo) |
| `fal-pecas/src/pages/Cart/CartPage.tsx` | Carrinho | Texto “Frete / A calcular” | FATO |
| `fal-pecas/src/pages/Checkout/CheckoutPage.tsx` | Checkout | `quoteFreight` no step 2; envia `shippingOptionId` | FATO |
| `fal-pecas/src/services/shipping/freightService.ts` | Cache 90s | Facade; comentário: não é verdade no place_order | FATO |
| `fal-pecas/src/services/shipping/shippingService.ts` | Adapter ativo | Resolve via `carrierRegistry` | FATO (pós-estrutura) |
| `fal-pecas/src/services/shipping/carrierRegistry.ts` | Catálogo carriers | mock/correios/frenet/carrier slot | FATO (novo) |
| `fal-pecas/src/services/shipping/shippingQuoteContract.ts` | Envelope cotação | status, expiresAt, fingerprint, gaps | FATO (novo) |
| `fal-pecas/src/services/shipping/quoteShippingEnvelope.ts` | Cotação envelope | UI futura PDP/carrinho | FATO (novo) |
| `fal-pecas/src/services/shipping/edgeQuoteClient.ts` | Invoke edge | `quote-shipping` | FATO (novo) |
| `fal-pecas/src/services/shipping/mockShippingProvider.ts` | Mock | economic/express/pickup | FATO |
| `.../providers/correiosStubProvider.ts` | Correios sandbox | PAC/SEDEX determinístico | FATO |
| `.../providers/frenetStubProvider.ts` | Frenet sandbox | Agregador simulado | FATO |
| `.../providers/carrierStubProvider.ts` | Slot futuro | Throw não implementado | FATO |
| `fal-pecas/supabase/functions/quote-shipping/` | Edge live | Esqueleto 501 até HTTP | FATO (novo) |
| `place_order` (migração F9-F) | Pedido | `resolve_mock_shipping_option` | FATO |
| `products.weight_kg` (+ dims) | Dados logísticos | Colunas F6C; admin peso sim; dims UI parcial | FATO / HIPÓTESE dims UI |

---

## C. Matriz de provedores

| Provedor | Estado real | Limitações | Próximos requisitos |
|----------|-------------|------------|---------------------|
| mock | Implementação mock alinhada ao pedido | Não é frete real | OK homologação / D-FRETE A·B |
| correios | Sandbox client (sem HTTP) | `placeOrderReady=false`; IDs `correios:*` rejeitados no RPC | Edge HTTP + secrets + RPC + VAL |
| frenet | Sandbox client | Idem | MARCHA própria se escolhido |
| carrier | Stub desabilitado no registry | Slot futuro | Contrato comercial + provider |

**MCP:** `@codespar/mcp-correios@0.2.0-alpha.3` em `.cursor/mcp.json` (credenciais locais vazias até eFe preencher). Ferramenta de agente/diagnóstico — **não** substitui edge da loja.

---

## D. Matriz de dados

| Dado | Disponível? | Origem | Validação | Impacto |
|------|-------------|--------|-----------|---------|
| CEP destino | Sim (checkout address) | `addresses` / ViaCEP | 8 dígitos nos sandboxes | Cotação |
| CEP origem | Sim | `store_shipping_origin` admin | — | Cotação |
| Peso | Coluna + admin | `products.weight_kg` | Checkout não passa no quote | Live incompleta |
| Dimensões | Colunas DB | `height/width/length_cm` | UI admin peso só; quote sem dims | Live incompleta |
| Qty / subtotal | Sim | Carrinho | Fingerprint envelope | Recotação |
| Opção no pedido | Só mock:* | RPC | Frontend pode enviar outro id → erro | Segurança parcial (servidor recalcula mock) |
| Validade cotação | Envelope novo (15 min) | Contrato TS | Ainda não wired na UI | Futuro |

---

## E. Matriz de riscos

| Risco | Evidência | Impacto | Prioridade | Mitigação |
|-------|-----------|---------|------------|-----------|
| UI Correios com env≠mock quebra place_order | RPC só mock | Checkout falha | Alta | Manter prod em mock até RPC live; registry `placeOrderReady` |
| Apresentar sandbox como frete real | Labels “sandbox” + aviso checkout | Confiança / legal | Alta | D-FRETE + disclaimer envelope |
| Cotação sem peso | Checkout items só id/qty | Cotação live errada | Alta | Recusar live sem logística (`logisticsGaps`) |
| Secrets no Vite | Anti-padrão | Vazamento | Alta | Só Edge + MCP local |
| Somar fretes por item | Não implementado (ainda) | Preço errado | Média | Cotação do **conjunto** no envelope |

---

## F. Fluxo-alvo

```text
PDP (CEP) → quoteShippingEnvelope / edge
  → Carrinho (mesma fingerprint; invalidar se itens/CEP mudam)
  → Checkout (revalidar + endereço)
  → place_order (servidor resolve valor; não confiar amount do client)
  → pagamento MP (trilho separado)
Falhas: invalid_cep | missing_logistics | not_configured | provider_error → mensagem + sem inventar preço
```

---

## G. Plano de implementação (ordenado)

1. ~~Auditoria + registry + envelope + edge esqueleto + MCP~~ **esta marcha**
2. eFe: D-FRETE (+ credenciais Correios se C) · paralelo MP H1–H6
3. MARCHA: HTTP Correios na edge + testes
4. MARCHA: `place_order` aceitar opções live validadas
5. MARCHA: UI PDP “Entrega e frete” + carrinho consolidado
6. VAL frete + E2E (separado do VAL MP)

---

## H. Decisões comerciais necessárias

| Decisão | Opções | Notas |
|---------|--------|-------|
| D-FRETE | A / B / C | PDP com cotação real exige caminho C (ou mensagem honesta em A/B) |
| Correios direto vs Frenet | Direto recomendado como 1ª integração a avaliar | Não decidir só por stub no repo |
| Retirada | Manter `mock:pickup` / política A | Mensagem ao cliente |
| Mensagem loja | Texto se sandbox/mock | Já há disclaimer no registry |

---

## I. Plano de testes e VAL

| Tipo | Sem secrets | Com humano/secrets |
|------|-------------|---------------------|
| Unit registry/envelope/sandbox | Sim (`carrierRegistry.test.ts`) | — |
| Edge quote-shipping 501/422 | Deploy + auth | Secrets Correios |
| MCP calculate_shipping | — | CORREIOS_* no Cursor |
| UI PDP/carrinho | Após MARCHA UI | — |
| E2E frete+MP | — | Após D-FRETE + MP smoke |

---

## J. Recomendação final (menor sequência segura)

1. Manter produção em **mock** até D-FRETE C + RPC live.  
2. Preencher MCP Correios local para diagnóstico (eFe).  
3. Assinar D-FRETE (C se quiser PDP com cotação real).  
4. MARCHA HTTP Correios na edge → RPC → UI PDP/carrinho → VAL frete → E2E.

---

## Encerramento auditoria

1. **Inspecionado:** PDP, cart, checkout, providers, freight/shipping services, place_order, products weight/dims, edges MP, docs D-FRETE/molde.  
2. **Evidências:** paths acima; sandbox sem HTTP; RPC mock-only.  
3. **Lacunas:** PDP/carrinho, peso no quote, live HTTP, RPC.  
4. **Escopo MARCHA técnica futura:** HTTP Correios + place_order + UI.  
5. **Estrutura já entregue nesta marcha:** registry, envelope, edge esqueleto, MCP config, tests.  
6. **Secrets:** nenhum valor lido/copiado; mcp.json com env vazios.
