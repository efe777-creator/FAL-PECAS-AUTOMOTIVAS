# Auditoria FAL Fase 0 — Inventário

**Data:** 2026-10-08  
**Modo:** somente leitura  
**Complementa:** [MAPA](./AUDITORIA_FAL_FASE0_MAPA_2026-10-08.md)

---

## 1. Estrutura `fal-pecas/src`

| Pasta | Estado | Notas |
|-------|--------|-------|
| `app/` | Ativo | router, guards |
| `components/` | Ativo | layout, product, admin, payments |
| `contexts/` | Ativo | Auth, Cart |
| `data/mocks/` | Ativo (fallback) | products, categories, vehicles |
| `hooks/` | Ativo | useCatalog |
| `lib/` | Ativo | supabase, money, productLabels, slug |
| `pages/` | Ativo | admin + loja |
| `services/` | Ativo | domínio principal |
| `services/auth/` | Vazio | auth em `supabase/authService` + context |
| `utils/` | Vazio | sem arquivos |
| `services/fase81/` | Ativo testes | simulador paralelo ao SQL |

---

## 2. Duplicidades / paralelos

| Item | Onde | Risco |
|------|------|-------|
| Formação de preço | `pricingFormulas.ts` + SQL `calculate_sell_from_cost` | Drift se um lado mudar |
| Custo base | SQL `product_base_cost` vs TS `resolveBaseCost` (+ FAL-SUP-01) | Preview ≠ apply |
| Preço vitrine | RPC resolve vs espelho `products.price`/`promo_price` | Card/carrinho vs checkout |
| Liberar na loja | Heurística própria ≠ `resolve_product_price` | Preço “liberável” ≠ preço exibido |
| Sort preço busca | RPC legado vs reordenação client | Página inconsistente |
| Schema | Migrations fase* no git vs `hf_f1_*` no remoto | **Crítico** |
| Nomenclatura veículo | montadora/manufacturer/fabricante | Confusão operacional |
| SKU vs Código referência | `productLabels` parcial + labels “SKU” restantes | UX inconsistente |
| Origem preço | `price_origin` vs history `source` vs vitrine `priceSource` | Três vocabulários |
| Pedidos UI | `OrdersPage` órfã vs `/conta/pedidos` | Código morto leve |

---

## 3. Mocks / sandbox / placeholders

| Artefato | Path | Uso |
|----------|------|-----|
| mockProducts/Categories/Vehicles | `src/data/mocks/*` | Fallback sem Supabase / erro |
| mockSearch | `searchService.ts` | Fallback |
| Mock frete | `mockShippingProvider.ts` | Default produção-dev |
| Stubs Correios/Frenet/carrier | `shipping/providers/*` | Sandbox determinístico |
| Pagamento simulado | `simulatedPaymentProvider.ts` | Default se env ≠ mercadopago |
| Gateway sandbox | `gatewaySandboxPaymentProvider.ts` | F9-C |
| `list_extra_cost` (R$) | pricing TS + SQL | Fora do cálculo (placeholder) |
| Footer Privacidade/Termos | `Footer.tsx` | “(em breve)” |
| cartStorage stub | `cartStorage.ts` | deprecated |
| orderService / productService fachadas | `@deprecated` | limpeza F10 |

**Sem `TODO`/`FIXME` em `src`** — dívida está em mocks e deprecations.

---

## 4. Funcionalidades incompletas / ausentes

| Capacidade | Estado |
|------------|--------|
| Histórico UI de imports (não-preço) | Ausente |
| Produtos relacionados | **Zero** (sem schema/UI) |
| Item de lista active/inactive | **Não existe** (só price>0 / lista status) |
| Overrides de preço | Código + migration repo; **tabela ausente no remoto** |
| Pedidos / ciclo F7 | Código + migrations repo; **ausente no remoto** |
| Estoque / modos | Idem |
| Frete real HTTP | Ausente |
| Smoke MP live | STOP humano |
| Dashboard KPIs além de pedidos | Só atalhos + zeros |
| Relatórios catálogo/margem/apps | Ausentes |
| E2E contínuo | Parcial (vitest domínio forte) |
| Storybook / Design tokens Figma | Não usados |

---

## 5. Telas e módulos — inventário rápido

### Admin — presente e operacional (código)

Produtos, import×3, preços/listas, categorias, montadoras, veículos, fabricantes, fornecedores+imports, pedidos, clientes, estoque, frete origem, relatórios, operadores, dashboard.

### Loja — presente

Home, catálogo, PDP, veículo, carrinho, checkout, conta (perfil/endereços/veículos/favoritos/pedidos), auth.

### Integrações

| Integração | Código | Remoto / env |
|------------|--------|--------------|
| Supabase | Sim | Projeto HF rebuild |
| Netlify | Sim | deploys recentes no git |
| Mercado Pago | Edge + SDK | Smoke STOP |
| ViaCEP | address lookup | OK caminho feliz esperado |
| Correios/Frenet | stubs | não produção |

---

## 6. Código aparentemente abandonado / legado

- `pages/Orders/OrdersPage.tsx` não roteada  
- `services/orders/orderService.ts` deprecated  
- `services/cart/cartStorage.ts` stub deprecated  
- Pasta `services/auth/` vazia  
- Pasta `utils/` vazia  
- Simulador `fase81DomainSimulator` (útil testes; não é runtime loja)  
- Migrations fase* no git **não aplicadas** no projeto MCP atual (histórico `hf_f1_*`)

---

## 7. Hardcoded / regras embutidas em UI

- Badges `CALCULATED` / `IMPORTED` / `MANUAL` em inglês na detail de preços  
- Priority default `0` / Promocional seed `100`  
- Fallback supplier FAL-SUP-01 no TS  
- Mensagens “Aplicações sob consulta” quando sem PVC  
- Checkout ainda referencia método placeholder `pix_simulated` em fluxo MP (evidência exploração checkout)

---

## 8. Testes existentes (inventário)

Vitest em pricing, price lists, cost resolve, F9-E webhook core, fase81 chain, imports.  
**Gap:** E2E browser contínuo; testes de elegibilidade loja em escala; contrato schema remoto vs app.

---

## 9. MCPs utilizados neste inventário

| MCP | Uso |
|-----|-----|
| Supabase | `list_projects`, `list_migrations`, `execute_sql` |
| Browser | Dashboard, catálogo, admin permissões |
| Git | log/branch/remote |
| Código | explore agents rotas/preços/import |

Context7 / Netlify / MP: inventário de presença; não necessários para fechar inventário estrutural.

---

## 10. Próximo artefato

→ [AUDITORIA_FAL_FASE0_FINDINGS_2026-10-08.md](./AUDITORIA_FAL_FASE0_FINDINGS_2026-10-08.md)
