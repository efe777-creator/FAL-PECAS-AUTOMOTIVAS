# FAL — Mapa de telas e jornadas (MVP 4.0)

**Versão:** 1.1  
**Data:** 2026-11-16  
**Status:** CANÔNICO  
**MVP:** [FAL_MVP_COMPLETO_4.0.md](./FAL_MVP_COMPLETO_4.0.md)  
**Execução:** [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md)  
**Router:** `fal-pecas/src/app/router.tsx`

Para cada tela: rota, perfil, objetivo, dados, contratos, estados, aceite MVP.

### Prioridade de consolidação (telas)

| Ordem | Telas | Gate |
|-------|-------|------|
| 1 | Checkout, admin pagamentos, webhooks | P0 → G3 |
| 2 | Carrinho, PDP frete, logística admin, conta pedido (rastreio) | G4 |
| 3 | Catálogo, Home, veículo/garagem seed | G1–G2 |
| 4 | Admin pedidos áreas, estoque | G5 |
| 5 | Legais, avisos, mobile crítico | G6–G7 |

---

## 1. Jornadas (trace canônico)

Formato: `Tela → estado → serviço → RPC/Edge → tabela → integração → UI`

### A — Descoberta | Fluidez: FLUI (com remenda leve)

1. Home / SearchBar / placa → NL ou `plate-lookup` → `VehicleFilter`  
2. `/catalogo` → `searchCatalog` → `search_products` → products + PVC  
3. Enrich preço/imagens → cards  
4. PDP → `getProductBySlugOrId` + apps summary  

**Aceite:** texto e veículo chegam ao mesmo contrato; empty state distingue “sem peça para veículo” vs busca vazia.

### B — Compra | REMENDA

PDP/cart → checkout (auth) → endereço → quote shipping → método → `place_order` → confirmação  

**Aceite:** fingerprint frete válido; total coerente; sem place_order se carrier não ready.

### C — Pagamento | REMENDA

`create-fal-payment` → router → MP/Asaas → webhook/sync → `payments` → status pedido  

**Aceite:** approve/recusa/duplicado; timeout não cria cobrança fantasma.

### D — Processamento | FLUI

Admin áreas análise/separação → `transition_order_status` / separation RPCs  

**Aceite:** UI não update status direto; fluxo documentado.

### E — Entrega | REMENDA

Expedição → label ME / own dispatch → `ship_order` → tracking → `deliver_order`  

**Aceite:** label purchased ≠ enviado; rastreio visível ao cliente.

### F — Pós-venda | TRAVA (RMA) / FLUI (cancel/confirm)

Conta pedido → cancel unpaid / request cancel / confirm receipt / report issue · legais  

**Aceite MVP:** cancel/confirm/issue; RMA estruturado = pós-MVP (página legal ok).

### G — Admin | FLUI

Clusters catálogo/estoque/pedidos/logística/pay  

### H — Atendimento | REMENDA

`app_notifications` → bell → `/conta/avisos` e `/admin/avisos`  

---

## 2. Telas loja

### `/` Home — público

| Campo | Conteúdo |
|-------|----------|
| Objetivo | Entrada: vitrine + veículo + atalhos |
| Lê | banners, destaques, promo, categorias, home settings |
| Escreve | — |
| Contratos | `homeContentService`, hooks catálogo |
| Mobile | Bottom nav; quick plate |
| Aceite | Ordem coerente; veículo acessível; CTAs claros |
| MVP | Sim |

### `/catalogo` — público

| Campo | Conteúdo |
|-------|----------|
| Objetivo | Listar peças com filtros q/cat/brand/veículo |
| Lê | `search_products`, categorias, brands, vehicle options |
| Escreve | URL state |
| Contratos | `searchCatalog`, NL, `VehiclePlateSearch` |
| Estados | loading, empty veículo, empty texto, erro |
| Aceite | Params veículo aplicados; NL deep-link; preço resolvido nos cards |
| MVP | Sim |
| Nota | `vehicle=1` escrito e não lido — ajustar |

### `/produto/:slugOrId` — público

| Campo | Conteúdo |
|-------|----------|
| Objetivo | Decidir compra: serve? preço? frete? |
| Lê | produto, apps, relacionados, preço, frete preview, pay hints |
| Escreve | cart local, buy-now, favorites |
| Aceite | Compatibilidade clara; preço = checkout; dims afetam frete |
| MVP | Sim |

### `/veiculo` — público

| Campo | Conteúdo |
|-------|----------|
| Objetivo | Identificar por placa (guest) |
| Lê/escreve | plate-lookup; não grava garagem sem auth |
| Aceite | Fallback manual se API down |
| MVP | Sim (descoberta) |

### `/conta/veiculos` — Protected

| Campo | Conteúdo |
|-------|----------|
| Objetivo | Seed Garage: meus carros |
| Lê/escreve | `customer_vehicles` via list/add/remove/primary |
| Aceite | Só salva com `version_id`; primário reutilizável no funil |
| MVP | Sim (seed) |
| Futuro | Painel rico do veículo |

### `/carrinho` — público

| Campo | Conteúdo |
|-------|----------|
| Objetivo | Revisar itens + cotar frete |
| Lê | cart, payment display, shipping quote |
| Aceite | Totais claros; indisponível tratado |
| MVP | Sim |

### `/checkout` — Protected

| Campo | Conteúdo |
|-------|----------|
| Objetivo | Fechar pedido |
| Passos | doc → endereço → frete → método → revisar |
| Escreve | `place_order`, addresses, payment create, condição % |
| Aceite | G3; sem duplicar; erros humanos |
| MVP | Sim |

### `/pedido/:id/confirmacao` — Protected

| Campo | Conteúdo |
|-------|----------|
| Objetivo | Confirmar criação / instruções pay |
| Aceite | Status e próximos passos claros |
| MVP | Sim |

### Conta: `/conta`, perfil, endereços, favoritos, pedidos, detalhe, avisos

| Tela | Aceite MVP |
|------|------------|
| Hub conta | Navegação clara |
| Perfil/endereços | CRUD seguro |
| Favoritos | Lista útil |
| Pedidos lista/detalhe | Status, rastreio, cancel/confirm/issue |
| Avisos | Inbox legível mobile |

### Auth / legal

Login, cadastro, recuperar/redefinir senha, termos, privacidade, trocas-devoluções — acessíveis; copy sem jargão interno.

---

## 3. Telas admin (clusters)

### Dashboard `/admin`

Indicadores/alertas; links para hubs. Aceite: não mentir contagens.

### Catálogo

| Rota | Objetivo MVP |
|------|--------------|
| `/admin/produtos` (+ novo/:id) | CRUD, status, disponibilidade, release |
| Imports (produtos/apps/HF/imagens) | Pipeline sem publicar cego |
| `/admin/aplicacoes` | Manter PVC |
| `/admin/precos` (+ :id) | Listas e itens |
| `/admin/categorias` | Árvore |
| `/admin/home` (+ promoções) | Vitrine |
| `/admin/busca` | Sinônimos/prep — **incluir no nav** |
| Montadoras/veículos/fabricantes | Mestre + INV ops |
| Fornecedores (+ imports) | Custo/conversão |

### Pedidos

Hub, lista, áreas (aguardando pagamento, análise, separação, expedição), visões, detalhe.  
**Aceite:** só RPCs de transição; wizard ops; margem visível quando aplicável.

### Estoque `/admin/estoque`

Ajuste + modo loja. Aceite: coerente com compra.

### Logística

Hub, origem, frete próprio, ME, caixas, prazos, settings. Aceite: cotação e ship gates.

### Pagamentos

Hub, provedores, métodos (roteamento), MP, webhooks. Aceite: espelha regra híbrida; Asaas on/off explícito.

### Clientes / avisos / relatórios / operadores

Consulta clientes; inbox staff; KPIs básicos; operadores só admin.

---

## 4. Matriz tela × domínio × MVP

| Tela | Domínios | MVP |
|------|----------|-----|
| Home | Commerce, Garage seed | Sim |
| Catálogo/PDP | Catálogo, Fitment, Preço | Sim |
| Veículo/Garagem | INV, Garage seed | Sim |
| Cart/Checkout | Order, Pay, Freight | Sim |
| Conta pedidos | Order, Atendimento | Sim |
| Admin pedidos | Order, Inventory, Freight | Sim |
| Admin pay/logística | Pay, Freight | Sim |
| Serviços/oficinas | Parceiros | **Não** |
| OS oficina | Workshop | **Não** |
| Histórico TO veículo | Garage rica | **Não** |

---

## 5. Navegação — coerência

| Problema | Ação |
|----------|------|
| Meus carros exige login; placa pública no Footer | Manter papéis; copy clara |
| `/admin/busca` fora do sidebar | Incluir no cluster Catálogo |
| Órfãos de página | Remover ou reaproveitar em limpeza pós-G7 |

---

## 6. Critérios transversais de UI

- Loading / empty / error / success em toda tela crítica  
- Mobile: touch targets, drawer filtros, inbox não cortada  
- Sem jargão (`webhook`, env keys) para cliente  
- Confirmação em ações destrutivas admin  
- Acessibilidade: foco, contraste, `role="alert"` em erros  
