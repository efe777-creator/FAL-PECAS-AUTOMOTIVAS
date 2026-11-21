# FAL — AUDITORIA INTEGRAL: Kits, Itens e Promoções

**Data:** 2026-11-20  
**Natureza:** auditoria técnica, funcional, comercial e arquitetural — **somente leitura**  
**Projeto Supabase inspecionado (read-only):** `wtbpwuiayednvlhvuhbh`  
**App:** `fal-pecas/`  
**Status do documento:** AUDITORIA CONCLUÍDA NESTA RODADA — **não autoriza implementação**  
**Princípio:** uma arquitetura coerente — não módulos isolados a “costurar” depois  

---

## 1. Resumo executivo

A FAL já possui um **prédio comercial operacional**: produto único (`products`), preço via listas + `resolve_product_price`, promoções por gate `product_promotions`, estoque por `product_id` com modos F8, checkout/`place_order` com snapshots, pedidos F7 e admin F8/Adaptive.

**Não existe** modelo de kit composto (BOM) no banco, no código nem em spec canônica de schema. “KIT AMORTECEDOR” é nome/categoria de produto simples. A única regra documental de kit de venda é **H12** (Onda 3, pós-MVP).

### O que já existe e será reaproveitado

| Domínio | Contrato atual |
|---------|----------------|
| Identidade comercial | `products` (SKU, slug, imagens, status, refs) |
| Fitment | `product_vehicle_compatibility` (PVC) + motor compat E.1 |
| Preço | `price_lists` / `price_list_items` / `resolve_product_price(s)` |
| Promo | `product_promotions` + lista não-default |
| Estoque | `inventory` + movimentos + modos + snapshot no pedido |
| Compra | `cart_items` → `place_order` → `order_items` (snapshots) |
| Ops | OrderOpsSurface / Adaptive Workspace / separação F7C |

### O que precisa ser estendido (não duplicado)

- Discriminador de natureza em `products` + tabela de **composição** kit→componente+qty  
- Expansão de reserva/baixa/disponibilidade para componentes no **mesmo** motor F7F/F8  
- Snapshot imutável da composição no pedido  
- Lista pública exclusiva para preços **manuais** de kits **dentro** do motor 6B  
- PVC/veredito **próprios** do kit (sem herança A∧B)  
- Admin/Adaptive: cadastro e checklist de componentes no shell existente  

### O que realmente precisa ser criado

- Entidade de composição + histórico de composição/substituição assistida  
- Regras de preço automático / manual / provisório no fluxo de resolve (sem segundo RPC de cobrança)  
- UX de kit na loja (selo, PDP composição, kits relacionados — evolução, não segundo PDP)  

### Maiores riscos

1. Tratar kit como “produto com desconto” sem composição rastreável.  
2. Herdar compatibilidade dos componentes.  
3. Criar estoque próprio do kit.  
4. Calcular preço fora de `resolve_product_price`.  
5. Alterar composição atual e contaminar pedidos antigos.  
6. Abrir implementação com conflitos BLOQUEADOR abertos (lista §27).  

### Decisões humanas necessárias (antes de codar)

Ver §29. Em especial: identidade do discriminador; política exata de PVC do kit; forma do snapshot no pedido; escopo da lista manual de kits vs grupos comerciais; % vs valor fixo em promo.

### Sequência recomendada

Fundação composição → preço → estoque/pedido → compat → promo → admin → loja. **Nenhuma fase começa com conflito BLOQUEADOR sem resolução humana.**

---

## 2. Escopo e metodologia

### Escopo

Auditar como incorporar **Kits** e evoluir **Itens** e **Promoções** sem duplicar estruturas, quebrando o mínimo possível o que já existe.

### Fora de escopo

Implementação, migrations aplicadas, alterações de dados, Figma, commits, deploys, abertura de frentes de código.

### Metodologia

1. Inventário documental pela ordem de [`docs/entrada/FAL_INDICE_CANONICO.md`](../entrada/FAL_INDICE_CANONICO.md).  
2. Cruzamento doc → código → migrations → runtime SQL read-only.  
3. Classificação tripla de evidência em cada afirmação crítica.  
4. Gate anti-emendo e contratos de fronteira.  
5. Matriz de impacto + alternativas A/B/C + recomendação única.  

### Classificação tripla de evidência

| Classe | Significado |
|--------|-------------|
| **CONFIRMADO_ATUAL** | Comprovado em código + migration e/ou runtime nesta auditoria |
| **SÓ_DOCUMENTAÇÃO** | Existe em doc; sem prova correspondente no código atual |
| **DIVERGENTE_OU_NÃO_COMPROVADO** | Doc≠código, parcial, ou não verificável |

### Ressalva metodológica

Pré-leituras de conversa **não** fecham a auditoria. Só o confrontado no repositório e no projeto Supabase `wtbpwuiayednvlhvuhbh` nesta execução conta como CONFIRMADO_ATUAL. Contagens do endpoint `list_tables` do MCP mostraram-se **desatualizadas** em alguns casos (ex. `price_lists`); contagens finais usam `execute_sql` read-only.

---

## 3. Inventário documental

Panorama: ~755 `.md` em `docs/` (maioria em `docs/planejamento/`). Pasta `docs/execucao/` **NÃO LOCALIZADA** (execuções em `EXECUCAO_FASE*.md` sob planejamento).

| Documento | Data | Área | Status | Decisões relevantes | Relação com Kits |
|-----------|------|------|--------|---------------------|------------------|
| `docs/entrada/FAL_INDICE_CANONICO.md` | 2026-11-16 | governança | **CANÔNICO** | Ordem de autoridade; 1 regra = 1 dono | Define como resolver conflitos |
| `docs/entrada/FAL_PRD_4.0.md` | 2026-11-16 | produto | **CANÔNICO** | Commerce primeiro; sem reconstrução | Sem modelo kit |
| `docs/arquitetura/FAL_ARQUITETURA_360.md` | 2026-11-16 | arquitetura | **CANÔNICO** | Ambientes; expansão sem clonar | Kits no Commerce |
| `docs/arquitetura/FAL_DADOS_FONTES_VERDADE.md` | 2026-11-16 | dados | **CANÔNICO** | SoT por entidade; lista do que não duplicar | Âncora da evolução |
| `docs/planejamento/FAL_MVP_COMPLETO_4.0.md` | — | MVP | **CANÔNICO** | Escopo done | Kits fora do núcleo MVP típico |
| `docs/planejamento/FAL_ROADMAP_MESTRE_4.0.md` | — | roadmap | **CANÔNICO** | Ordem de maturidade | Posiciona pós-MVP |
| `docs/planejamento/FAL_AUDITORIA_CONSOLIDADA_PRD4.md` | — | evidência | **CANÔNICO** | Evidência transversal | Cruzamento |
| `ESPECIFICACAO_FASE2_ARQUITETURA_DADOS.md` | 2026-10-03 | dados | **VIGENTE** (fundação) | Schema produtos/estoque/pedidos | Base `products` |
| `ESPECIFICACAO_FASE3_CATALOGO_COMERCIAL.md` | 2026-10-03 | catálogo | **VIGENTE** | Catálogo comercial | “Kits” como linha de negócio, não BOM |
| `ESPECIFICACAO_FASE4_MOTOR_BUSCA.md` | 2026-10-03 | busca | **VIGENTE** | `search_products` | Kits entram como produtos |
| `ESPECIFICACAO_FASE6_ECOMMERCE.md` | 2026-10-03 | checkout | **VIGENTE** | Carrinho/checkout | Autoridade compra |
| `ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md` | 2026-10-04 | preços | **VIGENTE** | Listas + resolve | Motor a estender |
| `ESPECIFICACAO_FASE6D_CICLO_PEDIDO.md` | 2026-10 | pedidos | **VIGENTE** | Ciclo pedido | Snapshots |
| `ESPECIFICACAO_FASE7_OPERACAO_PEDIDOS.md` | 2026-10-04 | ops | **VIGENTE** | F7A–F7F | Separação/expedição |
| `ESPECIFICACAO_ESTOQUE_OPERACAO_COMERCIAL.md` | 2026-10-04 | estoque | **VIGENTE** | 3 modos | Kit deve respeitar |
| `ESPECIFICACAO_FASE8_BACKOFFICE.md` | 2026-10 | admin | **VIGENTE** | Backoffice | Shell admin |
| Specs/relatórios F8.1–F8.4 | 2026-10-06 | preços/import | **HISTÓRICO+VIGENTE parcial** | F8.4 freeze; % pendente no doc | Drift vs runtime (§25) |
| `FAL_PLANO_MESTRE_HOME_COMERCIAL_2026-11.md` | 2026-11 | promo | **VIGENTE** | Destaque ≠ promo; gate | Promo kits |
| `FAL_SPEC_HOME_CONSOLIDACAO_GATE_PAG_2026-11-12.md` | 2026-11-12 | promo | **VIGENTE** | Opção A `product_promotions` | Reutilizar gate |
| `FAL_SPEC_ONDA3_COMERCIAL_PROMOCOES_2026-11-08.md` | 2026-11-08 | promo | **SUBSTITUÍDO** | SUPERSEDIDA pelo mestre Home | Princípios 2.1–2.5 preservados |
| `FAL_PLANO_BUSCA_EQUIVALENCIA_COMPATIBILIDADE_2026.md` | 2026-11-19 | compat | **CANÔNICO** (frente) | E.1–E.6; PVC; gate | Compat kits |
| Planos 0/1/2A Garagem | 2026-11 | garagem | **VIGENTE** | Snapshot veículo | Pedido kit+veículo |
| `FAL_PDP_REDESIGN_SPEC_CONSOLIDADA_2026-11-20.md` | 2026-11-20 | PDP | **VIGENTE** | 12 decisões layout | PDP kit / relacionados |
| `FAL_SPEC_ADAPTIVE_WORKSPACE_2026-11-17.md` | 2026-11-17 | admin | **VIGENTE** | Hub split | Ops kits |
| `FAL_MARCHA_ORDER_OPS_SURFACE_VAL_2026-11-19.md` | 2026-11-19 | admin | **VIGENTE** (VAL) | Surface pedido | Checklist componentes |
| `FAL_MARCHA_HOME_ONDAS_2_4_PACOTES_2026-11-10.md` | 2026-11-10 | kits | **PENDENTE** (doc only) | **H12** kit com apps+estoque | Única regra kit venda |
| Spec dedicada kit/BOM | — | kits | **NÃO LOCALIZADO** | — | Lacuna central |
| `docs/entrada/FAL_PRD_3.0.md` / Roadmap 3.0 | — | legado | **HISTÓRICO** | Substituídos pelo 4.0 | Não usar como autoridade |
| `docs/README.md` | — | entrada | **DIVERGENTE** | Ainda aponta 3.0 | Drift documental |

---

## 4. Documentos canônicos

Ordem de autoridade (índice):

1. Visão 2040  
2. PRD 4.0  
3. Arquitetura 360 + **Fontes de Verdade**  
4. MVP Completo 4.0  
5. Roadmap Mestre 4.0  
6. Specs/MARCHAs/VALs (tática / evidência)

**Frentes proprietárias para esta auditoria:**

| Tema | Dono |
|------|------|
| Dados / SoT | `FAL_DADOS_FONTES_VERDADE.md` |
| Preço | Fase 6B + Home Comercial / gate HOME-03 |
| Compat | `FAL_PLANO_BUSCA_EQUIVALENCIA_COMPATIBILIDADE_2026.md` |
| PDP | Spec consolidada 2026-11-20 |
| Estoque | Spec estoque comercial + F7F/F8 |
| Admin ops | Adaptive + OrderOps |

---

## 5. Estado real da arquitetura

```text
Loja: Catalog/Search → PDP → Cart → Checkout(place_order) → Pedido
Admin: Produtos / Preços / Promoções(home) / Estoque / Pedidos(Adaptive+OrderOps)
Dados: products ← PVC; price_lists → resolve; inventory; product_promotions
```

**Camadas (`fal-pecas/`):**

| Camada | Responsabilidade | Evidência |
|--------|------------------|-----------|
| Pages/UI | Loja + admin | `src/pages/**`, `router.tsx` |
| Services | Domínio TS | `priceResolutionService`, `adminProduct*`, `placeOrderService`, `compatibilityEngine` |
| SQL/RPC | Autoridade preço/pedido/estoque | migrations `fase6b`, `product_promotions_gate`, `place_order_core_hybrid`, F7F/F8 |
| RLS | `is_staff()` + dono | Fase 2 schema |

**CONFIRMADO_ATUAL:** não há `is_kit`, `product_type`, `product_kit_*`, `kit_items` em SQL/TS. Runtime: `to_regclass('product_kit_components')` / `kit_items` = null.

---

## 6. Modelo de dados atual

### 6.1 Tabelas relevantes (contrato + runtime)

| Tabela | Finalidade | PK / FKs importantes | Migrations | Runtime (SQL) |
|--------|------------|----------------------|------------|---------------|
| `products` | Identidade comercial | `sku` unique, `slug` unique | `20261003180000` + evoluções | ~100 produtos |
| `product_images` / `product_references` | Mídia / códigos | → products | Fase 2/3 | imagens ~100 |
| `product_categories` / `product_brands` | Classificação / marca | árvore parent | Fase 2/3 | — |
| `product_vehicle_compatibility` | Fitment (PVC) | product + vehicle_version; year_start/end | Fase 2 + imports | **730** linhas |
| `product_equivalences` | Equiv. técnicos E.6 | produto↔produto | `20261119234500` | **0** linhas |
| `product_related_links` | Relacionados comerciais PDP | — | `20261106120000` | 0 |
| `price_lists` | Listas comerciais | slug unique; is_default único | `20261004020000` | **2** (preco-base, promocional) |
| `price_list_items` | Preço por produto/lista | unique (list, product) | Fase 6B | **197** |
| `price_change_history` | Auditoria preço | — | 6B | — |
| `product_price_overrides` | Exceção pontual | prioridade no resolve | 6B1 | — |
| `product_promotions` | Gate promo | 1 active/product | `20261112210000` | **2** |
| `product_promotion_events` | Histórico gate | — | HOME-03 | 7 |
| `inventory` / `inventory_movements` | Saldo / ledger | PK product_id | Fase 2 | **inventory 0** |
| `store_settings` | `inventory_mode` | — | F8 | modo **`sem_estoque`** |
| `carts` / `cart_items` | Carrinho | unique (cart, product) | Fase 2 + G6 snapshot | — |
| `orders` / `order_items` | Pedido + linhas | snapshots preço/SKU/veículo | Fase 2 + 6B + F7 + G6 | orders 68; items 75 |
| `order_events` / `order_status_history` | Auditoria ciclo | — | F7A | — |

**Não existem:** `product_applications` (nome legado em docs antigos → PVC), tabelas de kit/BOM.

### 6.2 RPCs centrais

| RPC | Papel | Evidência |
|-----|-------|-----------|
| `resolve_product_price` / `resolve_product_prices` | Autoridade de preço exibição/cobrança | 6B + gate HOME-03 |
| `place_order` → `place_order_core_hybrid` | Checkout | FAL PAY hybrid + patches |
| `release_order_reservations` / `fulfill_order_reservations` | Liberação / baixa | F7F + F8 |
| `transition_order_status` | Ops + fulfill em `enviado` | F7F |
| `adjust_inventory` / `set_store_inventory_mode` | Admin estoque | F8 |
| `search_products` | Catálogo | Fase 4 + year range |
| `recalculate_price_list_items` / `apply_price_list_import` | Formação / import | F8.1 |

### 6.3 Hierarquia atual de preço (CONFIRMADO_ATUAL)

Migration `20261112210000_product_promotions_gate.sql`:

1. Override ativo vigente  
2. Listas `public`+`active`: default **sempre** candidata; demais só com `product_promotions` ativa+vigente; maior `priority`  
3. Fallback lista default  

---

## 7. Módulo de itens

### Cadastro atual (CONFIRMADO_ATUAL)

| Aspecto | Onde |
|---------|------|
| Rotas | `/admin/produtos`, `/novo`, `/:id` — `AdminProductsPage`, `AdminProductFormPage` |
| Serviços | `adminProductService`, seções imagens/refs/aplicações/equivalências/relacionados |
| SKU / commercial_ref | Colunas distintas; UI diferencia |
| Aplicações | `AdminProductApplicationsSection` → PVC |
| Preços na ficha | Espelho listas Base/Promo; loja usa resolve |
| Permissão UI | `adminNavAccess`: produtos em STOCK (+estoque); preços MGMT |

### Natureza do produto

Arquitetura atual trata **todo** produto como item comercial unitário. Não há variação/BOM/composição. Produtos cujo nome é “KIT …” são SKUs simples (ex. remap categoria em `20261112150000_remap_products_category_leaves.sql`).

### Evolução desejada (decisão de negócio — auditoria)

- Componentes continuam vendáveis individualmente.  
- Kit = entidade comercial independente vinculada aos componentes.  
- Dependências: consultar kits que usam um item; impacto de preço/status/aplicação; substituição assistida.

**Evidência de ausência de composição:** CONFIRMADO_ATUAL (grep + `to_regclass`).

---

## 8. Arquitetura de kits proposta

### Alternativas

| | A — Kit como `products` + composição | B — Tabela `kits` separada do catálogo | C — Apenas categoria/nome “kit” (status quo) |
|--|--------------------------------------|----------------------------------------|-----------------------------------------------|
| Reutilização | Máxima (busca, PDP, cart, resolve, promo) | Baixa (segundo catálogo) | Nenhuma composição |
| Complexidade | Média | Alta (duplica superfícies) | Baixa / inadequada |
| Anti-emendo | Passa | **Falha** (segundo catálogo) | Não atende negócio |
| Histórico | Snapshot no order_item | Precisa espelhar | N/A |

### Recomendação (fundamentada)

**Alternativa A:** kit = linha em `products` com discriminador de natureza comercial (`product_kind` ou equivalente) + tabela `product_kit_components` (`kit_product_id`, `component_product_id`, `quantity`, constraints anti-circular, qty > 0, componente ≠ kit).

Justificativa: preserva SoT de catálogo ([Fontes de Verdade §2.2](../arquitetura/FAL_DADOS_FONTES_VERDADE.md)); evita segundo catálogo; permite SKU/slug/imagens/SEO próprios; encaixa em search/cart/checkout existentes.

**DECISÃO HUMANA:** nome exato do discriminador e se kits parciais/completos são SKUs distintos vs “modelos relacionados” (ver §8.1).

### 8.1 Kits parciais e completos

| Abordagem | Prós | Contras |
|-----------|------|---------|
| **SKUs separados** (parcial vs completo) | Clareza comercial; preço/promo/estoque distintos; simples na loja | Mais cadastros |
| Variações comerciais | Menos SKUs | Sistema atual **não** tem modelo de variação — seria emenda grande |
| “Modelos de kit” | Template reutilizável | Segunda abstração prematura |

**Recomendação v1:** SKUs comerciais separados (ex. kit parcial e kit completo). Relacionar via `product_related_links` / inteligência PDP — sem inventar motor de variação.

---

## 9. Composição e dependências

### Requisitos

- Kit ≥ 2 componentes (ou ≥ 1 com qty≥2 — **DECISÃO HUMANA** mínimo)  
- Componente em vários kits; quantidade por linha  
- Histórico de alterações de composição  
- Sem ciclo kit→…→kit  
- Componentes ativos / qty positiva  

### Representação recomendada

```text
products (kind=kit)
  └── product_kit_components (kit_id, component_id, qty, sort, valid_from/to opcional)
  └── product_kit_component_events (audit: add/remove/replace/qty_change)
```

Consultas: “quais kits usam o produto X?” = índice em `component_product_id`.

### Impactos a detectar (serviço de domínio único)

| Evento no componente | Efeito |
|----------------------|--------|
| Preço muda | Kits auto recalculam; manuais preservam; manuais sem preço → provisório |
| Status archived / indisponível | Alertar kits; bloquear publicação se política exigir |
| PVC muda | Alertar revisão de compat do kit |
| Nome/imagem | Em geral cadastral; não altera preço |

**Não duplicar** dados do componente no kit — só FKs + qty.

---

## 10. Substituição assistida

Fluxo desejado (negócio aprovado) × arquitetura:

1. Admin escolhe componente antigo → novo.  
2. Sistema lista kits afetados (query composição).  
3. Preview: preço auto/manual, PVC, disponibilidade.  
4. Admin seleciona kits a atualizar.  
5. Transação: update composição + eventos + recalc preço se auto.  
6. Kits não selecionados intactos.  
7. Pedidos antigos **intocados** (snapshot).

**Implementação segura:** RPC `security definer` staff-only, uma transação, sem UPDATE em `order_items` históricos.

**Classificação:** SÓ_DOCUMENTAÇÃO / decisão aprovada no brief — **não implementado**.

---

## 11. Compatibilidade veicular

### Política canônica (CONFIRMADO_ATUAL como dono)

[`FAL_PLANO_BUSCA_EQUIVALENCIA_COMPATIBILIDADE_2026.md`](./FAL_PLANO_BUSCA_EQUIVALENCIA_COMPATIBILIDADE_2026.md): PVC única; estados card/motor; gate compra não confirmada; equivalência ≠ alternativa `probable`.

Código: `compatibilityEngine.ts`, `compatCopy.ts`, `compatDecisionSession.ts`, PVC table.

### Regra fundamental para kits

**CONFIRMADO como requisito de negócio:**  
`Compat(A) ∧ Compat(B) ≠ Compat(Kit)`.

### Alternativas de modelagem

| | A — PVC próprio do kit (curadoria) | B — Interseção automática dos PVC dos componentes | C — União automática |
|--|-------------------------------------|-----------------------------------------------------|----------------------|
| Risco de compra errada | Controlado | Médio (pode ser vazio demais) | **Alto** (emenda perigosa) |
| Trabalho admin | Alto | Médio | Baixo |
| Alinhamento política | Melhor | Aceitável como **sugestão** | Rejeitar |

**Recomendação:** A como SoT do kit; B apenas como **assistente de revisão** (nunca publicação silenciosa). Alteração de PVC de componente → alerta nos kits; possível bloqueio de publicação (**DECISÃO HUMANA** severidade).

H12 documental: “kit só aparece se todos itens OK e aplicação validada” — **SÓ_DOCUMENTAÇÃO** (backlog); deve ser reconciliado com PVC próprio do kit (não assumir herança).

---

## 12. Estoque compartilhado

### Estado atual (CONFIRMADO_ATUAL)

- `inventory`: on_hand / reserved; movimentos in/out/adjust/reserve/release  
- Modos: `com_estoque` | `estoque_ficticio` | `sem_estoque`  
- Snapshot: `orders.inventory_mode_at_order`  
- Reserva no `place_order` só se modo `com_estoque`  
- Baixa no `enviado` via `fulfill_order_reservations`  
- Runtime: modo loja **`sem_estoque`**; tabela `inventory` com **0** linhas  

Docs alinhados: `ESPECIFICACAO_ESTOQUE_OPERACAO_COMERCIAL.md`, AUDITORIA F7F/F8, migration `20261004170000`.

### Venda de kit (requisito)

Disponibilidade teórica: `MIN(floor(disp_i / qty_i))`.  
Venda de N kits: reservar/baixar `N * qty_i` de cada componente no **mesmo** motor.

### Alternativas

| | A — Expandir no place_order/fulfill/release | B — Inventory próprio do kit | C — Só `is_available` booleano do kit |
|--|---------------------------------------------|------------------------------|----------------------------------------|
| Anti-emendo | Passa | **Falha** | Insuficiente em `com_estoque` |
| Consistência | Atômica se RPC única | Diverge do físico | Aceitável só em `sem_estoque` |

**Recomendação:** A. Kit **não** tem linha de `inventory` (ou tem linha zerada nunca usada — preferir **não criar**).

**Risco:** concorrência em componentes compartilhados — mitigar com `FOR UPDATE` já usado no core.

---

## 13. Preços automáticos

### Motor atual (CONFIRMADO_ATUAL)

`resolve_product_price` + `priceResolutionService.ts` + sync legado `products.price`/`promo_price`.

Formação F8.1: `pricing_method`, `recalculate_price_list_items`, `list_extra_cost_percent` — **coluna existe em runtime** (CONFIRMADO_ATUAL), apesar do relatório F8.4/outubro marcar % como pendente F8.5 (**DIVERGENTE** documental).

### Preço automático do kit

Soma dos preços **resolvidos** dos componentes (mesma RPC, mesmo cliente/`p_at`).  
Persistência: ou materializar na lista Base do kit como espelho recalculável, ou resolver dinamicamente — **DECISÃO HUMANA** (ver alternativas §24). Recomendação: materializar via job/serviço de domínio único após mudança de componente, ainda lido só por `resolve_product_price`.

---

## 14. Lista geral de preços manuais dos kits

### Decisão de negócio aprovada (brief)

Lista pública exclusiva para preços manuais de kits; edição na ficha do kit e na tela da lista = **mesma persistência** (`price_list_items`).

### Integração no motor

- Lista `scope=public`, não default, dedicada (slug a definir).  
- Resolve continua único.  
- Manual ausente → soma provisória + alerta admin; **não** converter modalidade.  

### Limitações

- Hoje listas `assigned` / grupos comerciais existem no schema (`scope`) mas o gate promo foca `public`.  
- Uma lista geral de kits **não** espelha automaticamente atacado/varejo por cliente.  
- **DECISÃO HUMANA:** kits manuais entram só na lista geral na v1, ou também em listas assigned futuras?

**Recomendação v1:** uma lista pública `preco-kits-manual` (nome TBD) + Base para auto/provisório; não criar segundo resolve.

---

## 15. Promoções

### Estado atual (CONFIRMADO_ATUAL)

| Camada | Realidade |
|--------|-----------|
| Preço promo | `price_list_items` em lista não-default (ex. `promocional`) |
| Efetividade | `product_promotions` ativa + vigência |
| Admin | `/admin/home/promocoes` — `AdminPromotionsPage` + `adminProductPromotionService` |
| Regra | 1 promo ativa por produto (unique partial index) |
| Campanha multi-SKU / cupom | **Não existe** |

Princípio Home: lista cadastrada ≠ promoção ativa. Spec Onda 3 SUPERSEDIDA; mestre Home vigente.

### Promoções de kits (decisões aprovadas no brief)

- Promo própria do kit; **sem** herança/acúmulo dos componentes  
- Sobre preço-base do kit (auto/manual/provisório)  
- 1 ativa por kit; sem sobreposição de períodos  
- Se base muda, desconto recalcula; preço promo anterior **não** vira nova base  

### Alternativas de mecanismo

| | A — Reutilizar `product_promotions` no `product_id` do kit | B — Tabela `kit_campaigns` | C — Só lista promocional sem gate |
|--|-----------------------------------------------------------|----------------------------|-----------------------------------|
| | Passa anti-emendo | Segundo motor | Regressão pré-HOME-03 |

**Recomendação:** A. Preço promocional do kit na lista promo (ou lista promo de kits se segregação comercial exigir — **DECISÃO HUMANA**).

### Em aberto (não decidir na auditoria)

% vs valor fixo; limites; aprovação gerencial; margem mínima; segmentação; cupons.

---

## 16. Catálogo e busca

### Estado (CONFIRMADO_ATUAL)

`search_products` + `searchService.ts` + `search_document` + sinônimos admin. Filtro veículo via PVC. Token “kit” em `interpretSearchQuery.ts` é sinônimo de busca, **não** tipo de produto.

### Descoberta de kits

Com kit em `products` published + kind, entra naturalmente na busca/catálogo. Diferenciação visual: selo “Kit” / badge — **extensão de UI**, não segundo catálogo.

Filtros futuros por kind — estender RPC, não fork.

---

## 17. PDP

### Estado

`ProductPage.tsx` + redesign spec 2026-11-20 (buy-box, compat, galeria). Relacionados: `relatedProductsIntelligence` + `product_related_links` + equivalências.

### Página do kit

Mesma rota `/produto/:slug` com blocos condicionais: composição, qty, economia vs avulso (se preços comparáveis), disponibilidade agregada, veredito próprio.

### Kits na PDP do componente

Proposta em avaliação: “compre o kit completo” via query composição invertida + `product_related_links`. **Não redesenhar PDP** nesta etapa; encaixar na hierarquia consolidada.

---

## 18. Carrinho e checkout

### Estado (CONFIRMADO_ATUAL)

- Carrinho: 1 linha por `product_id` (`unique cart_id, product_id`)  
- Preço: resolve no merge/checkout  
- `place_order` / `place_order_core_hybrid`: idempotência, resolve server-side, reserva se `com_estoque`, snapshots  

### Representação do kit no carrinho

Cliente vê **1 linha** (SKU do kit). Não explodir componentes na UI do cliente.

### Checkout

Manter contrato: payload items ou cart; preço servidor prevalece; expansão de estoque **só no RPC** (transparente ao front).

**Risco:** frete/dims do kit — hoje dims no produto; kit precisa política de medidas (**DECISÃO HUMANA**: dims próprias vs soma).

---

## 19. Pedidos e separação

### Estado

`order_items`: sku, name_snapshot, unit_price, qty, price_list_id, availability, separated, vehicle_snapshot.  
Separação: flags `separated` — **não** mexe estoque. Baixa no enviado.

### Necessidade para kits

- Linha comercial = kit  
- **Snapshot imutável** da composição vigente (`composition_snapshot` jsonb ou `order_item_components`)  
- OrderOps: checklist lista componentes×qty a partir do snapshot  
- Cancel/release: liberar componentes reservados, não o “estoque do kit”  

### Alternativas snapshot

| A — jsonb em `order_items` | B — tabela filha | C — só product_id atual |
|----------------------------|------------------|-------------------------|
| Simples; versionável | Normalizado; joins | **Quebra** rastreio |

**Recomendação:** A na v1 (jsonb congelado no insert) + leitura no OrderOps; evoluir para B se volume/ops exigir.

Devolução física: hoje sem RPC de reposição automática pós-ship — kits herdam a mesma lacuna (documentar; não inventar segundo fluxo).

---

## 20. Administração

### Estado (CONFIRMADO_ATUAL)

Menu `adminNavConfig` / RBAC `adminNavAccess`. AdaptiveWorkspace + OrderOpsSurface (VAL onda 1). Promoções sob Home. Preços F8. Detalhe produto com seções.

### Evolução

| Capacidade | Encaixe |
|------------|---------|
| Listagem/cadastro kits | `/admin/produtos` com filtro kind **ou** rota `/admin/kits` no **mesmo** shell (preferir filtro no módulo produtos na v1 para não fragmentar) |
| Composição | Seção na ficha (como Applications) |
| Preço manual | Mesmo serviço `adminPriceListService` + lista kits |
| Promo | Mesma `AdminPromotionsPage` (kits aparecem como products) |
| Substituição assistida | Fluxo/modal no módulo produtos |
| Separação | OrderOps estendido |

**Anti-emendo:** não criar painel “Kits Ops” paralelo ao Adaptive.

---

## 21. Importação

Pipelines F8: catalog, applications, HF bundle (≠ kit), conversion, cost, price_list — `imports`/`import_items`.

**Import de composição de kits:** **não** necessário na primeira versão funcional. Evolução futura após fundação + UI manual estável.

HF Bundle = import produto+aplicação — **homônimo**, não kit comercial.

---

## 22. Segurança e permissões

### Estado (CONFIRMADO_ATUAL)

- Roles: customer, administrador, gerente, operador, estoque, atendimento  
- RLS: `is_staff()` para escrita catálogo/preço  
- UI: promoções/preços = MGMT (admin/gerente); produtos incluem estoque  

### Kits

Reutilizar papéis existentes:

| Ação | Papel sugerido (sem novo role) |
|------|--------------------------------|
| Criar/editar kit, composição | catalog_ops / MGMT (alinhar a produtos) |
| Preço manual / promo | MGMT |
| Substituir componente | MGMT ou admin |
| Publicar/arquivar | igual produtos |

Toda mutação de composição/preço via RPC staff + RLS. **Não** confiar só na UI.

---

## 23. Matriz de impacto

Legenda evidência: C=CONFIRMADO_ATUAL · D=SÓ_DOCUMENTAÇÃO · X=DIVERGENTE_OU_NÃO_COMPROVADO

| Área | Estado atual | Alteração necessária | Reutilização | Risco | Dependências | Evid. |
|------|--------------|----------------------|--------------|-------|--------------|-------|
| Produtos | SKU unitário | kind + composição | `products` | Médio | SoT catálogo | C |
| Catálogo/busca | `search_products` | filtro/selo kind | RPC+searchService | Baixo | products | C |
| Classificação | categorias L3 | opcional categoria kits | product_categories | Baixo | — | C |
| Preços | 6B+resolve | lista kits + auto/provisório | resolve | **Alto** se fork | 6B | C |
| Lista kits manual | Inexistente | nova price_list pública | price_list_items | Médio | 6B | D |
| Formação custo | F8.1 + % runtime | kits: custo = soma? | recalculate | Médio | F8.1 | C/X doc |
| Promoções | gate HOME-03 | aplicar a kits | product_promotions | Médio se herança | Home | C |
| Compat/PVC | motor E.1 | PVC próprio kit | engine+PVC | **Alto** se herdar | canônico compat | C |
| Equivalências | tabela vazia E.6 | não misturar com kit | product_equivalences | Baixo | — | C |
| Minha Garagem | snapshot G6 | kits usam mesmo vehicle_snapshot | G6 | Baixo | place_order | C |
| Estoque | F7F/F8; modo sem_estoque | expansão componentes | inventory ops | **Alto** | F8 | C |
| Carrinho | 1 linha/product | linha kit | CartContext | Médio | — | C |
| Checkout | place_order hybrid | expand reserve | core hybrid | **Alto** | F6 | C |
| Pedidos | snapshots preço/veículo | composition_snapshot | order_items | **Alto** | F7 | C |
| Separação | separated flag | checklist componentes | OrderOps | Médio | F7C | C |
| Expedição | fulfill por product_id linha | fulfill componentes | fulfill RPC | **Alto** | F7F | C |
| Clientes | customers | nenhuma estrutural | — | Baixo | — | C |
| Administração | F8 shell | seções kit | AdminLayout | Médio | — | C |
| Adaptive/OrderOps | VAL fechada | ler snapshot composição | OrderOpsSurface | Médio | — | C |
| Permissões | is_staff + nav | sem novos roles v1 | adminNavAccess | Baixo | — | C |
| Importação | F8 pipelines | kits = futuro | imports | Baixo | — | C |
| PDP | redesign 2026-11-20 | blocos composição | ProductPage | Médio | spec PDP | C |
| SEO | seo_* em products | kit próprio | products | Baixo | — | C |
| Relatórios | admin reports | vendas kit vs componentes | services | Baixo | — | C |

---

## 24. Alternativas arquiteturais (síntese)

Já detalhadas nas seções 8–15. Resumo da **recomendação única**:

1. Kit ∈ `products` + composição N:N  
2. Um `resolve_product_price`  
3. Sem `inventory` de kit; expansão no core  
4. Snapshot composição no pedido  
5. Promo via `product_promotions` no kit  
6. PVC próprio do kit  
7. Admin no shell existente  

Qualquer desvio para “módulo kits isolado” falha o gate anti-emendo.

---

## 25. Conflitos documentais

| Conflito | Detalhe | Classe |
|----------|---------|--------|
| F8.4 % pendente vs runtime | Relatório 2026-10-06: `list_extra_cost_percent` pendente F8.5; **SQL confirma coluna existe** | X |
| `product_applications` em docs antigos | Tabela real = PVC; decisão F3 import inteligente | X |
| Onda 3 Promo SUPERSEDIDA | Não usar como plano de execução; princípios ok | — |
| README → PRD 3.0 | Índice canônico manda 4.0 | X |
| H12 vs brief kits | H12 fala “todos itens OK + aplicação”; brief exige PVC próprio e não herança | **BLOQUEADOR conceitual** a reconciliar |
| Contagens MCP `list_tables` | Desatualizadas vs `execute_sql` | X (ferramenta) |
| Spec kit BOM | NÃO LOCALIZADO | Lacuna |

---

## 26. Lacunas

### 26.1 Doc sem código

- H12 kits Onda 3  
- Substituição assistida  
- Lista preços manuais kits  
- Snapshot composição  

### 26.2 Código sem doc de kits

- Promoções HOME-03 implementadas sem menção a kits  
- Equivalências E.6 / related intelligence sem BOM  

### 26.3 Planejamentos conflitantes / drift

Ver §25.

### 26.4 Runtime observado (amostra)

| Métrica | Valor |
|---------|-------|
| products | ~100 |
| price_lists | 2 (base + promocional) |
| price_list_items | 197 |
| product_promotions | 2 |
| PVC | 730 |
| inventory rows | 0 |
| inventory_mode | sem_estoque |
| product_equivalences | 0 |
| kit tables | null |

---

## 27. Riscos

| ID | Risco | Severidade | Mitigação arquitetural |
|----|-------|------------|------------------------|
| R1 | Segundo catálogo/motor | BLOQUEADOR | Gate anti-emendo |
| R2 | Compat herdada A∧B | BLOQUEADOR | PVC próprio |
| R3 | Estoque próprio kit | BLOQUEADOR | Expansão componentes |
| R4 | Preço fora do resolve | BLOQUEADOR | Um contrato |
| R5 | Snapshot ausente | BLOQUEADOR | jsonb/tabela no insert |
| R6 | Concorrência componentes | ALTO | FOR UPDATE no core |
| R7 | Composição muda com pedido aberto | ALTO | Pedido usa snapshot; composição atual só novos |
| R8 | Promo componente “vaza” no kit | ALTO | Resolve só no kit_id |
| R9 | Manual sem preço silencioso | MÉDIO | Provisório + alerta |
| R10 | Cancel parcial / devolução incompleta | MÉDIO | Mesma lacuna atual pós-ship; documentar |
| R11 | Dims/frete kit | MÉDIO | Decisão dims |
| R12 | Abrir código com conflitos abertos | BLOQUEADOR processo | Gate §28 |

---

## 28. Decisões aprovadas (negócio — brief + canônicos)

1. Arquitetura única; não módulos costurados.  
2. Não criar segunda versão do que já existe.  
3. Kit = produto comercial independente com composição rastreável.  
4. Componentes continuam vendáveis.  
5. Estoque compartilhado; sem estoque físico do kit.  
6. Preço auto = soma; manual em lista exclusiva; ausente = provisório + alerta.  
7. Promo do kit independente dos componentes; 1 ativa; sem sobreposição.  
8. Compat não é soma automática.  
9. Pedido preserva fotografia.  
10. Substituição assistida com seleção por kit.  
11. Nenhuma implementação com conflito arquitetural importante sem resolução.  

---

## 29. Decisões em aberto (DECISÃO HUMANA NECESSÁRIA)

| ID | Pergunta | Impacto |
|----|----------|---------|
| H1 | Nome/coluna do discriminador (`product_kind` vs flag) | Schema |
| H2 | Mínimo de componentes / qty | Constraints |
| H3 | Parcial vs completo: só SKUs separados? | Cadastro |
| H4 | Materializar preço auto na lista vs resolve dinâmico | Performance/consistência |
| H5 | Lista manual kits vs listas assigned/grupos | Comercial B2B |
| H6 | Severidade: PVC componente muda → alerta vs despublicar kit | Ops |
| H7 | Dimensões/peso do kit (próprios vs regra) | Frete |
| H8 | Rota admin `/admin/kits` vs filtro em produtos | UX admin |
| H9 | % vs valor fixo em promo (mecanismo) | Promo |

> **H8 supersede (2026-11-20):** hub `/admin/kits` (+ `/precos`) é o caminho canônico de cadastro/precificação; filtro em Produtos permanece só para visão unificada e redireciona edição de kit ao hub. Promo só em Home › Promoções › Kits.
| H10 | Reconciliar H12 com PVC próprio | Publicação loja |
| H11 | jsonb vs tabela filha no snapshot v1 | Pedidos |

**BLOQUEADORES para iniciar implementação:** H1+H4+H6+H10+R5 contrato fechado no mínimo.

---

## 30. Roadmap recomendado

> Roadmap descreve ordem técnica. **Não autoriza início** enquanto BLOQUEADORES de §27/§29 estiverem abertos.

### Necessário — primeira versão funcional

| Fase | Objetivo | Banco (conceitual) | RPCs/Services | UI | Testes/Smoke | Não fazer |
|------|----------|--------------------|---------------|-----|--------------|-----------|
| **K0** | Decisões humanas H1–H11 + doc contrato | — | — | — | Checklist decisões | Codificar |
| **K1** | Fundação kind + composição + events | tables/constraints | CRUD composição staff | Seção ficha produto | Unit constraints/ciclo | Import kits; loja |
| **K2** | Preço auto/manual/provisório | lista kits; campos modality | serviço domínio único → resolve | Ficha + lista preços | Smoke resolve kit | Segundo resolve |
| **K3** | Estoque agregado + place_order expand | — | patch core hybrid / fulfill / release | — | E2E 3 modos | inventory kit |
| **K4** | Snapshot composição no pedido + OrderOps | coluna/jsonb | place_order insert; OrderOps read | Checklist | Pedido histórico imutável | Reescrever order_items |

### Necessário — versão comercial completa

| Fase | Objetivo |
|------|----------|
| **K5** | Compat: PVC kit + alertas + gate publicação |
| **K6** | Promo kits via product_promotions |
| **K7** | Loja: selo, PDP composição, disponibilidade, economia |
| **K8** | Substituição assistida transacional |
| **K9** | Admin polish + permissões validadas + Adaptive |

### Evoluções futuras

| Fase | Objetivo |
|------|----------|
| **K10** | Import composição em massa |
| **K11** | Kits em listas assigned / B2B |
| **K12** | Relacionados “compre o kit” na PDP componente |
| **K13** | Devolução/reposição física explícita (se produto pedir) |

Arquivos prováveis (quando autorizado): migrations novas; `place_order_core_hybrid`; `priceResolutionService` / admin price; `AdminProductFormPage`; `OrderOpsSurface`; `ProductPage`; `compatibilityEngine` (veredito kit).

---

## 31. Critérios de aceite

### Desta auditoria

- [x] Inventário documental com autoridade  
- [x] Código + migrations inspecionados  
- [x] Runtime SQL read-only (projeto wtbp…)  
- [x] Pilares F6/F6B/F7/F8 protegidos na análise  
- [x] 7 contratos de fronteira  
- [x] Matriz de impacto  
- [x] Alternativas + recomendação única  
- [x] BLOQUEADORES e decisões humanas separados  
- [x] Roadmap sem autorizar código  
- [x] **PARAR** sem implementação  

### De uma futura v1 funcional (após K0)

- Kit vende como 1 SKU; composição rastreável  
- Preço só via resolve; manual/auto/provisório corretos  
- Reserva/baixa só em componentes; modos F8 ok  
- Pedido antigo imutável após mudança de composição  
- Promo kit ≠ promo componentes  
- Compat kit não herda A∧B silenciosamente  
- Admin no shell existente  

---

## 32. Conclusão e recomendação técnica

A FAL **já tem** o prédio: catálogo, preço, promo gate, estoque modal, checkout e ops. Kits devem ser **ampliação coerente** desse prédio — composição + regras nos contratos existentes — **nunca** um anexo com motores paralelos.

**Recomendação:** adotar Alternativa A (kit ∈ `products` + BOM + extensão dos RPCs atuais), fechar decisões humanas BLOQUEADOR (§29), só então executar K1–K4. Manter H12 reconciliado com PVC próprio. Tratar drift F8.4/% como lição: **sempre** classificar evidência (doc de outubro ≠ runtime).

**Próximo passo humano:** revisar este relatório, resolver H1/H4/H6/H10 e conflitos §25, autorizar (ou não) um plano de implementação separado na branch `dev`.

---

## Apêndice A — Gate anti-emendo (checklist permanente)

| Pergunta | Resposta desta auditoria |
|----------|--------------------------|
| Segundo catálogo? | Não |
| Segundo resolve? | Não |
| Inventory de kit? | Não |
| Compat paralela? | Não |
| Checkout paralelo? | Não |
| Herança promo/compat? | Não |
| Snapshot pedido? | Obrigatório |
| Módulo isolado a costurar? | Não |

## Apêndice B — Arquivos âncora citados

- `fal-pecas/supabase/migrations/20261003180000_fase2_schema_rls.sql`  
- `fal-pecas/supabase/migrations/20261004020000_fase6b_price_lists.sql`  
- `fal-pecas/supabase/migrations/20261112210000_product_promotions_gate.sql`  
- `fal-pecas/supabase/migrations/20261004150000_fase7f_inventory_ops.sql`  
- `fal-pecas/supabase/migrations/20261004170000_fase8_inventory_modes.sql`  
- `fal-pecas/supabase/migrations/20261006160000_list_extra_cost_percent_prepared.sql`  
- `fal-pecas/src/services/pricing/priceResolutionService.ts`  
- `fal-pecas/src/services/admin/adminProductPromotionService.ts`  
- `fal-pecas/src/services/compatibility/compatibilityEngine.ts`  
- `fal-pecas/src/services/orders/placeOrderService.ts`  
- `fal-pecas/src/app/router.tsx`  
- `docs/entrada/FAL_INDICE_CANONICO.md`  
- `docs/arquitetura/FAL_DADOS_FONTES_VERDADE.md`  
- `docs/planejamento/FAL_PLANO_BUSCA_EQUIVALENCIA_COMPATIBILIDADE_2026.md`  
- `docs/planejamento/FAL_PLANO_MESTRE_HOME_COMERCIAL_2026-11.md`  
- `docs/planejamento/FAL_PDP_REDESIGN_SPEC_CONSOLIDADA_2026-11-20.md`  

## Apêndice C — Classificação de achados (amostra)

| Achado | Classe |
|--------|--------|
| Ausência total de BOM/kit no schema | CONCLUÍDO / CONFIRMADO_ATUAL |
| Promoções = lista + gate | CONCLUÍDO / CONFIRMADO_ATUAL |
| place_order expande só product_id da linha | CONCLUÍDO / CONFIRMADO_ATUAL |
| H12 sem implementação | PENDENTE / SÓ_DOCUMENTAÇÃO |
| Spec kit dedicada | NÃO LOCALIZADO |
| F8.4 % vs coluna presente | DIVERGENTE |
| PVC próprio do kit | DECISÃO HUMANA + BLOQUEADOR até política |
| Segunda versão de motores | RISCO / rejeitado pelo gate |
| Import kits v1 | OPCIONAL / BACKLOG |

---

**Fim da auditoria. PARAR. Nenhuma implementação iniciada.**
