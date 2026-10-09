# PRD Mestre 2.0 — FAL Peças Automotivas

**Versão:** 2.0 (consolidado)  
**Data:** 2026-10-08  
**Status:** Documento-base de produto — não é autorização para implementar tudo  
**Produto:** Plataforma própria FAL Peças Automotivas  
**Diagnóstico:** [../planejamento/DIAGNOSTICO_CONSOLIDACAO_FAL_3.0_2026-10-08.md](../planejamento/DIAGNOSTICO_CONSOLIDACAO_FAL_3.0_2026-10-08.md)  
**Execução de fases:** [../planejamento/ROADMAP_FASES_3.0.md](../planejamento/ROADMAP_FASES_3.0.md)  
**Estado observado (Fase 0):** [../planejamento/AUDITORIA_FAL_FASE0_PLANO_CORRECAO_2026-10-08.md](../planejamento/AUDITORIA_FAL_FASE0_PLANO_CORRECAO_2026-10-08.md) — gate Onda 0; schema-first

---

## Legenda de estado

| Estado | Significado |
|--------|-------------|
| **CONCLUÍDO** | Implementado e validado no escopo documentado |
| **EM VALIDAÇÃO** | Existe implementação; falta smoke, regressão ou gate |
| **EM ANDAMENTO** | Em desenvolvimento |
| **BLOQUEADO** | Depende de ação humana, credencial ou decisão |
| **PLANEJADO** | Definido como próxima evolução, ainda não implementado |
| **FUTURO** | Visão sem compromisso imediato |
| **DECISÃO PENDENTE** | Requer decisão humana |
| **A CONFIRMAR** | Evidência insuficiente nos documentos |

Este PRD descreve **o produto**. Detalhe de implementação fica em specs/relatórios. Ordem de execução fica no **Roadmap**.

---

# 1. Identidade do produto

A FAL é uma **plataforma própria** para operação e comércio digital de peças automotivas: catálogo, preços, estoque, pedidos, clientes, importações e loja.

**Tese:** a base operacional já existe. Antes de evoluir, o banco em execução e as migrations do código devem representar a **mesma arquitetura** (Fase 0 / F10-O0). Em seguida: **polir, consolidar, validar e completar** — não reconstruir do zero.

---

# 2. Visão

Operação interna estruturada → catálogo mestre confiável → loja própria coerente → integrações e enriquecimento → escala.

O núcleo da FAL é a **fonte interna de verdade** dos dados comerciais e de catálogo. Fontes externas **complementam**; não substituem automaticamente o núcleo.

---

# 3. Objetivo

Plataforma escalável e modular que administre a operação digital da FAL, com crescimento sem exigir reconstrução da arquitetura.

**Não é objetivo imediato:** ERP completo, WMS completo, PIM/MDM corporativo, dezenas de integrações simultâneas.

---

# 4. Princípios fundamentais

1. **Uma verdade por domínio** — custo, preço, estoque, pedido, aplicação têm fonte definida.  
2. **Reutilizar antes de criar** — consolidar/corrigir engines existentes.  
3. **Importação não publica** — cadastro ≠ disponibilidade comercial.  
4. **Sem alteração silenciosa de preço** — decisões explícitas pós-custo.  
5. **status ≠ disponibilidade** — `status` no catálogo; `is_available` na loja.  
6. **Mobile-first na loja**; backoffice prioriza desktop sem sacrificar usabilidade.  
7. **Independência operacional** em relação a fontes externas (ex.: HF como fornecedor/fonte, não autoridade universal).  
8. **Evolução controlada** — descoberta → auditoria → consolidação → plano → autorização → implementação → testes → gate → STOP.

---

# 5. Arquitetura conceitual

```text
                 FAL
                  │
                  ▼
        ┌───────────────────┐
        │ OPERAÇÃO INTERNA  │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ CATÁLOGO MESTRE   │
        └─────────┬─────────┘
                  │
        ┌─────────┼──────────┐
        ▼         ▼          ▼
      LOJA      APIs       OPERAÇÃO
     PRÓPRIA   FUTURAS     INTERNA
                  │
                  ▼
           FONTES EXTERNAS
           (enriquecimento)
```

**Stack real (CONCLUÍDO):** React + TypeScript + Vite + Tailwind + Supabase (Auth, PostgreSQL, RLS, Storage, Edge Functions).  
Detalhe técnico: [ARCHITECTURE.md](./ARCHITECTURE.md).

---

# 6. Fontes de verdade

| Domínio | Fonte de verdade |
|---------|------------------|
| Produto | Entidade `products` (SKU técnico único) |
| Custo | `supplier_products.cost` (por fornecedor/produto) — **sem** custo paralelo por lista |
| Preço de venda | Listas / itens / regras (`price_lists`, `price_list_items`, `price_origin`) |
| Estoque | Módulo de estoque + `inventory_mode` / snapshot no pedido |
| Pedido | Módulo de pedidos (preços do momento da compra) |
| Aplicação | `product_vehicle_compatibility` (produto × versão de veículo) |
| Classificação | Categorias hierárquicas (até 3 níveis) |

**Hierarquia de decisão em conflito:** regra de negócio aprovada → banco/RPC real → serviço oficial → docs técnicas recentes → UI → docs antigas → mocks.

---

# 7. Estado atual do projeto

### CONCLUÍDO
- F1–F7 (loja base, busca, conta, checkout base, operação de pedidos 7A–7F)
- F8 Fatia A: estoque UI, modos de loja, clientes consulta, relatórios base
- F8.1 base: import catálogo, conversão fornecedor, custo, preço; formação markup/margem/fixo; UX listas
- Identidade UI “Código referência” (rótulo sobre SKU)
- Liberar na loja (gate explícito) — fluxo admin

### EM VALIDAÇÃO
- Catálogo público com preço formado (muitos itens ainda indisponíveis comercialmente)
- Importação de aplicações (motor/RPC existem; cobertura de dados parcial)
- Checkout pós-pago / retirada de simulação quando MP ativo

### BLOQUEADO
- **F9-E smoke live/sandbox:** configuração `MP_WEBHOOK_SECRET` + redeploy da Edge Function (STOP Bloco G)
- Permissões granulares (Bloco F — fundação adiada)

### PLANEJADO
- **F10** Consolidação operacional (polimento e coerência da plataforma)
- **F9-F** após desbloqueio humano do smoke MP
- **F11** Catálogo mestre (taxonomia, aplicações, referências, qualidade)

### FUTURO
- F12 Enriquecimento / matching / APIs de catálogo
- F13 Escala comercial (SEO, analytics, canais)

### F9-E (registro obrigatório)

> **F9-E — Webhook concurrency / hardening: concluído localmente.**  
> Inclui `decideWebhookTransition`, `sanitizeWebhookPayload`, `isWebhookTsFresh`, claim idempotente por `(provider, provider_event_id)`, fallback por `external_reference`, releitura de status antes de aprovação e sincronização do core com a Edge Function.  
> **13 testes Vitest + build aprovados.**  
> Smoke live/sandbox permanece pendente devido à configuração do `MP_WEBHOOK_SECRET` e redeploy da função.  
> **Status: STOP antes da MARCHA F9-F.**

---

# 8. Usuários e permissões

| Perfil | Papel |
|--------|--------|
| Administrador / Gerente | Configuração, cancelamentos sensíveis, importações, operadores |
| Operador | Produtos, preços, estoque, pedidos, clientes (conforme role) |
| Cliente | Navegar, buscar, comprar, conta, pedidos |

Roles atuais existem; **matriz granular módulo × Ver/Criar/Editar/Excluir** = PLANEJADO (Bloco F). Enforcement deve ser RLS/RPC, não só esconder menu.

---

# 9. Produtos

Entidade central. Campos conceituais: identidade, classificação, fabricante da peça, fornecedor principal, descrições, posição/lado quando aplicável, mídia, flags de incompletude.

### Identidade (cadeia)

```text
ID interno
    ↓
SKU FAL (products.sku) — identificador técnico único e estável
    ↓
Código referência (products.commercial_ref) — comercial / UI / loja
    ↓
Referências de fabricante (product_references)
    ↓
Códigos / vínculo de fornecedor (supplier_products)
    ↓
EAN/GTIN — quando aplicável (evolutivo)
    ↓
Equivalências — FUTURO / PLANEJADO
```

- **D-REF (FAL-IMP-03 — 2026-10-09):** `commercial_ref` distinto de `sku`. Se um estiver vazio no save, espelha o outro. Ambos únicos.  
- UI operacional e loja exibem **Código referência** (`commercial_ref`).  
- SKU FAL permanece no formulário (identidade técnica) e em import/matching.

### Prontidão comercial (conceitual — não substitui o modelo de campos)

```text
Cadastrado → Dados OK → Comercialmente OK → Liberado → Publicado (status) → Disponível (is_available)
```

Quantidade de produtos **cadastrados/published** ≠ quantidade **vendável**. Completude (custo, preço, apps, dados mínimos) governa a operação da loja.

### Ciclo de vida atual em campos (CONCLUÍDO)

```text
status: draft | published | archived
+
is_available: boolean (disponibilidade comercial)
```

`status ≠ is_available`.  
Modelo longo DRAFT → EM REVISÃO → ATIVO → INATIVO → ARQUIVADO = **FUTURO** (não substitui o modelo atual).

### Disponibilidade comercial (regras independentes)

1. Importação **não** seta `is_available=true` nem força publicação.  
2. `status` controla presença no catálogo publicado.  
3. `is_available` exige confirmação explícita (**Liberar na loja**).  
4. Preço vem da resolução de listas / override — item **com preço** (price > 0) é pré-requisito do gate de liberação.  
5. Estoque depende do `inventory_mode` da loja (e do snapshot no pedido).  
6. **D-LIBERAR (2026-10-08):** liberação em massa só com **checklist mínimo** (ex.: preço válido, dados mínimos, categoria válida; aplicação/imagem quando exigidas). Proibido “selecionar N → publicar” sem validação.  
7. **Vitrine (IMP-11):** listagem pública = `published` (indisponível pode aparecer com indicação); compra no card/PDP = `is_available` + preço resolvido.

Não reduzir isso a uma única fórmula “publicado + lista + preço = available” sem deixar as regras independentes explícitas.

---

# 10. Catálogo

### Catálogo operacional atual (CONCLUÍDO / EM VALIDAÇÃO)

- Produtos, categorias (até 3 níveis), busca textual e por veículo, PDP, home/destaques  
- Fabricantes de peça e montadoras/veículos (base)  
- Aplicações PVC (parcial em cobertura de dados)  
- Imagens (suporte existe; completude variável)

### Catálogo mestre evolutivo (PLANEJADO → FUTURO)

Produto com fabricante, categoria, referências, fornecedores, custos, preços, imagens, aplicações (veículos), equivalências, indicadores de completude — aprofundar em **F11**, sem fingir que já está completo.

**Taxonomia:** Grupo → Categoria → Subcategoria (máx. 3 níveis). Alteração de modelo só após validação contra o banco real.

### Normalização de nomes (FAL-IMP-02 — 2026-10-09)

- **Matching** (import/cadastro/anti-dup): chave sem acento, maiúsculas, espaços colapsados.  
- **Categoria (exibição):** maiúsculas pt-BR.  
- **Montadora / fabricante / modelo (exibição):** trim + espaços; preserva casing comercial.  
- Implementação: `fal-pecas/src/lib/entityNormalize.ts`.

---

# 11. Classificação

Estrutura: **Grupo → Categoria → Subcategoria**.  
Quarto nível bloqueado na UI/serviço (CONCLUÍDO).  
Taxonomia definitiva de negócio = A CONFIRMAR se divergir do seed atual.

---

# 12. Fabricantes e montadoras

| Conceito | Significado |
|----------|-------------|
| Fabricante da peça | Quem produz a peça |
| Montadora | Quem produz o veículo |

Não misturar. Exibição de fabricante na vitrine (card e PDP) = **mostrar quando houver** `product_brands` (IMP-07).

---

# 13. Veículos e aplicações

**Veículos (conceitual):** Montadora → Modelo → Versão → Motor → Ano/período.  
**Aplicação:** produto compatível com configuração veicular (PVC), com `year_start` / `year_end` quando aplicável.

Estado: estrutura **CONCLUÍDA**; cobertura de dados **PARCIAL**. Ampliação = F10/F11 + import de aplicações.  
Não inventar aplicações; imports externos passam por validação/matching.

---

# 14. Referências e equivalências

- Referências de fabricante: suporte atual (CONCLUÍDO base).  
- Códigos de fornecedor: via conversão/`supplier_products` (CONCLUÍDO).  
- Equivalências cruzadas avançadas: **FUTURO** (F11/F12).

---

# 15. Fornecedores

Fornecedor possui identificação, vínculo a produtos, `supplier_sku`, custo e status.  
Relação produto–fornecedor é independente do produto mestre.  
Fornecedor principal do produto (`products.supplier_id`) alimenta a formação de preço pelo custo.

---

# 16. Custos

**Fonte de verdade:** `supplier_products.cost`.  
Não criar `cost_by_list` nem custo paralelo por lista de preço.

### Resolução de custo (DIV-002 — decidido 2026-10-08)

Uma **única regra** na camada central/SQL (incl. fallback FAL-SUP-01 **se** for regra oficial).  
TS e demais clientes **consomem** essa regra — sem duplicar fallback só no frontend.

### Importação de custos (CONCLUÍDO)

Pipeline: arquivo → leitura → normalização → validação → prévia → aprovação → aplicação → auditoria.  
Para FAL Principal, vínculo de `products.supplier_id` quando NULL (formação enxerga o custo).

### Após atualizar custo — decisão explícita

| Opção | Comportamento |
|-------|----------------|
| **A — Só custo** (padrão) | Não altera preço de venda |
| **B — Custo + preço** | Recalcula venda pela regra da lista (só `calculated`) |
| **C — Manter preço** | Preço fixo; indicadores (markup/margem efetivos) atualizam na UI |

Nunca alterar preços silenciosamente.

---

# 17. Preços e listas

**Uma única engine** — não criar segunda.

### Cadeia oficial de preço

```text
PRODUTO → CUSTO → REGRA DE PREÇO → PREÇO RESOLVIDO → Admin / Loja / Pedido
```

Admin, loja e pedido **não** possuem lógicas paralelas de resolução.

### Métodos (`pricing_method`)
- Preço fixo  
- **Markup sobre custo**  
- **Margem sobre venda**

**Markup ≠ margem** — devem ser mostrados e explicados como conceitos distintos.

### Origem (`price_origin`)
- `calculated` — formado pela regra a partir do custo  
- `imported` — veio de importação de preço  
- `manual` — definido manualmente  

### Regra D16 (CONCLUÍDO)
Alterações de custo/regra **recalculam somente** itens `calculated`.  
`imported` e `manual` **não** são alterados silenciosamente.

### Listas
Nome, status (`draft` / `active` / `inactive`), prioridade, default, regras (%), itens, origem por item.  
Listas inativas podem ser editadas; não devem ser elegíveis para venda na resolução pública.  
`priority` da lista é regra real de desempate — documentar, não remover.

### Item de lista (DIV-001 — decidido 2026-10-08)

Item **não** tem `active/inactive` independente. Modelo oficial:

- **com preço** (price > 0, materializado)  
- **sem preço**

Lista ativa/inativa ≠ item com/sem preço ≠ produto `is_available`.

### UI operacional (CONCLUÍDO base)
Colunas: Produto | Código referência | Custo | Markup | Margem | Preço | Ação.  
Modal **Editar precificação** (custo leitura; markup/preço editáveis conforme modo A/B/C).

---

# 18. Estoque

Domínio independente do cadastro de produto.

**Modos de loja (CONCLUÍDO):**
- `com_estoque`  
- `estoque_ficticio`  
- `sem_estoque`  

> O `inventory_mode_at_order` registrado no pedido é o modo que governa o comportamento **daquele** pedido (anti-retroatividade).

Reserva/baixa/liberação conforme F7F; UI admin F8.

---

# 19. Clientes

Cadastro, endereços, pedidos, favoritos, veículos salvos (CONCLUÍDO base na loja).  
Admin: consulta listagem/detalhe (CONCLUÍDO Fatia A).  
CPF/e-mail pendente/exclusão de conta: entregues no backlog D (validar regressão em F10).

---

# 20. Pedidos

Preservam cliente, itens, quantidades, preços do momento, frete, totais, status e histórico de eventos.  
**Não** recalcular pedido histórico com preços atuais.  
Ciclo operacional F7: recepção → separação → expedição → entrega (CONCLUÍDO).

---

# 21. Checkout

Fluxo: carrinho → identificação → endereço → frete → pagamento → revisão → pedido.  
Valida disponibilidade e resolve preço no momento da compra (CONCLUÍDO base).  
Polish pós-pago e alinhamento com MP ativo = F9-F / F10.

---

# 22. Pagamentos

Adapter Mercado Pago (Pix / cartão) + webhook.  
Estado detalhado: ver §7 (F9-E).  
**Produção não está validada** enquanto o smoke FAIL/pendente por secret/redeploy.

---

# 23. Frete

Módulo independente (CEP/endereços F6C).  
Provedor real de transportadora = **EM ANDAMENTO / DECISÃO PENDENTE**.  
Evolução: regras, regiões, faixas, integrações — sem travar o núcleo.

---

# 24. Catálogo público

Apresentação do **mesmo** produto mestre (sem cadastro paralelo só para a loja).  
Usa produto, categoria, aplicações, imagens, preço resolvido, `is_available`.  
Busca: código referência, referências, nome, categoria, veículo/aplicação.

---

# 25. Importações e qualidade de dados

### Domínios separados (não importador universal)

| Domínio | Conteúdo |
|---------|----------|
| Catálogo | Produtos / classificação / atributos |
| Conversão | Código fornecedor ↔ produto FAL |
| Custo | `supplier_products.cost` |
| Preço | Itens de lista (`imported` etc.) |
| Aplicações | Produto × veículo (trilha própria) |

### Pipeline padrão

```text
arquivo → leitura → normalização → validação → prévia → aprovação → aplicação → auditoria
```

### Não fazer
Criar categorias/veículos/produtos lixo sem regra; duplicar SKU; publicar automaticamente; alterar preço sem opção explícita; perder histórico.

### Qualidade (PLANEJADO / FUTURO)
Indicadores de completude (imagem, aplicação, fabricante, etc.) — F11. Percentual é operacional, não verdade absoluta.

---

# 26. Segurança e auditoria

- Auth Supabase; roles staff; RLS e RPCs para operações críticas.  
- Operações sensíveis não dependem só da UI.  
- Importações e mudanças de preço/status geram trilha/relatório.  
- Permissões granulares: PLANEJADO (Bloco F).

**Processo de evolução:** Descoberta → Auditoria → Consolidação → Implementação → Validação → Regressão.

**Parar e pedir decisão humana** se: conflito de regra; risco de perda de dados; migration destrutiva; mudança massiva de preço; mudança de fonte de verdade; ambiguidade de negócio.

---

# 27. UX/UI

**Admin:** menos cliques, estados claros, confirmações em ações críticas, dados técnicos acessíveis sem poluir.  
**Cliente:** encontrar peça → entender aplicação → confiar → ver preço → saber disponibilidade → comprar.  
Responsividade: loja mobile-first; admin desktop-first com uso mobile aceitável.

---

# 28. Testes e qualidade

Prioridade de regressão:  
- Admin: login → produto → preço → liberação → catálogo  
- Cliente: catálogo → produto → carrinho → checkout → pedido  
- Custo: import → decisão A/B/C → preço  

Unitários de domínio (preço, import, webhook) já existem em várias frentes. E2E contínuo = F10.

**Definition of Done:** código + regra consolidada + banco/RPC + UI + permissões + testes + build + regressão aplicável + documentação atualizada.

---

# 29. Observabilidade

Logs de Edge Functions, relatórios de import, eventos de pedido.  
Monitoramento de produção pleno = FUTURO / F13 (sem afirmar que já existe stack completa).

---

# 30. Escopo

### Dentro
Plataforma própria, backoffice, catálogo operacional, custos/preços, estoque, pedidos, clientes, frete (evolutivo), loja, importações, integrações de pagamento, evolução controlada do catálogo mestre.

### Fora do imediato
ERP/WMS/PIM/MDM completos; expansão massiva sem priorização; matching por IA como obrigação; dezenas de integrações simultâneas.

### Estratégia de catálogo inicial
Priorizar veículos/grupos de maior giro e potencial (ex.: suspensão com base em histórico), não “todo o mercado”.

---

# 31. Lacunas atuais

Ver detalhe e prioridades no [Diagnóstico](../planejamento/DIAGNOSTICO_CONSOLIDACAO_FAL_3.0_2026-10-08.md) (gaps P1–P4).  
Resumo: smoke MP; liberação comercial em escala; cobertura de aplicações; permissões granulares; frete real; polimento F10.

---

# 32. Roadmap consolidado (visão macro)

Detalhe e gates: [ROADMAP_FASES_3.0.md](../planejamento/ROADMAP_FASES_3.0.md).

| Bloco | Fase | Objetivo | Status |
|-------|------|----------|--------|
| A | F1–F7 | Fundação + operação de pedidos | CONCLUÍDO |
| B | F8 / F8.1 | Operação comercial (produtos…importações) | Base construída |
| C | F9 | Pagamento + frete + hardening | F9-E local DONE → STOP → F9-F |
| **D** | **F10** | **Consolidação operacional / polimento** | **PRÓXIMO FOCO** |
| E | F11 | Catálogo mestre | PLANEJADO |
| F | F12 | Enriquecimento e inteligência | FUTURO |
| G | F13 | Escala comercial | FUTURO |

### F10 — Consolidação operacional (não é só visual)

Garantir que o construído funcione como **uma plataforma coerente**: UX admin/checkout, estados, mensagens, permissões, preços, disponibilidade, estoque, pedidos, clientes, importações, relatórios, erros, loading, empty states, responsividade, auditoria, regressão.

---

# 33. Critérios de conclusão

Uma frente só fecha com gate documentado (auditoria/STOP) e DoD do §28.  
Nenhuma fase avança automaticamente sem critérios de saída.

---

# 34. Regras de evolução

Antes de qualquer mudança relevante, responder:

1. Qual problema estamos resolvendo?  
2. Qual é a fonte de verdade?  
3. Isso já existe no sistema?  
4. Qual o impacto nas demais áreas?  
5. Como validaremos que não quebramos o que já funciona?

Se não houver resposta clara → não implementar automaticamente.

---

# 35. Visão futura (FUTURO)

Enriquecimento externo (ingestão → normalização → matching → confiança → revisão → aplicação → auditoria); APIs; equivalências avançadas; imagens com proveniência; analytics; automações; novos canais comerciais.

**Autoridade por campo (diretriz futura):** uma fonte pode ser autoridade em aplicação ou imagem sem ser autoridade em preço/publicação — hierarquia definitiva = DECISÃO PENDENTE antes de F12.

---

# 36. Decisões (2026-10-08) e pendentes

### Decididas / direcionadas (gate Fase 0)

| ID | Decisão | Entrega |
|----|---------|----------|
| D-SCHEMA | Hipótese: migrations `fase*` (opção 1), condicionada a `FAL-IMP-01` | F10-O0 |
| DIV-001 | Item lista = com preço / sem preço | **Feito IMP-09** |
| DIV-002 | Custo: regra única central/SQL | **Feito IMP-08** |
| D-REF | Referência comercial distinta do SKU (`commercial_ref`) | **Feito IMP-03** |
| D-LIBERAR | Checklist mínimo para liberação em massa | **Feito IMP-10** |

### Ainda pendentes

1. Provedor de frete em produção (D-FRETE).  
2. ~~Fabricante na vitrine (card vs PDP)~~ — **feito IMP-07** (exibir se cadastrado).  

3. Taxonomia se divergir do banco.  
4. Hierarquia de autoridade de campos no enriquecimento (antes de F12).  
5. Confirmação final de apply D-SCHEMA após diff IMP-01 (se destrutivo).

---

# 37. Regra mestra

> **FAL = plataforma própria + operação própria + catálogo mestre próprio + arquitetura aberta a integrações futuras.**

Este PRD é a **base consolidada**, não uma autorização para implementar tudo de uma vez.
