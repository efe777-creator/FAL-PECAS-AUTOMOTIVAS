# FAL — Plano mestre canônico  
## Home da Loja — Frente Comercial (Destaques, Promoções, Pagamentos e Configurações Gerais)

**Projeto:** FAL — Peças Automotivas  
**Data:** 12/11/2026  
**Status:** Frente 1 + Gate pós-F1 **concluídos** · Frente 2 liberada (12/11/2026)  

**Classificação:** Frente comercial paralela  
**Identificação:** HOME-01 a HOME-08  
**Backlog de execução:** [FAL_HOME_BACKLOG_01_08.md](./FAL_HOME_BACKLOG_01_08.md)  
**Spec anterior (histórico):** [FAL_SPEC_ONDA3_COMERCIAL_PROMOCOES_2026-11-08.md](./FAL_SPEC_ONDA3_COMERCIAL_PROMOCOES_2026-11-08.md) — **SUPERSEDIDA** por este plano  

**Relacionados:**  
[ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md](./ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md) · [FAL_AUDITORIA_022_PRECO_CONTRATOS_E0_2026-11-09.md](./FAL_AUDITORIA_022_PRECO_CONTRATOS_E0_2026-11-09.md) · [PLANO_DETALHADO_F8_5_ADICIONAL_PERCENT_2026-10-06.md](./PLANO_DETALHADO_F8_5_ADICIONAL_PERCENT_2026-10-06.md) · [PLANO_MESTRE_F8_PROXIMAS_FASES_2026-10-06.md](./PLANO_MESTRE_F8_PROXIMAS_FASES_2026-10-06.md) · [FAL_MATRIZ_AJUSTES_001_034_2026-11-09.md](./FAL_MATRIZ_AJUSTES_001_034_2026-11-09.md) · AJUSTE-035 (Checkout — fora desta frente)

---

## 1. Objetivo

Estruturar a evolução da **Home da Loja** e de sua administração comercial, garantindo que produtos, preços promocionais, condições de pagamento e elementos de apresentação funcionem de forma integrada, consistente e escalável.

A evolução deve aproveitar os módulos existentes — em especial o módulo de listas de preços — evitando duplicidade de regras, motores comerciais paralelos ou alterações desnecessárias em componentes críticos.

A área administrativa será organizada em quatro áreas:

1. Destaques  
2. Promoções  
3. Pagamentos  
4. Configurações gerais  

Campanhas/banners permanecem na Home da Loja (aba/submenu existente); o menu pai deve ser rotulado **Home da Loja**.

O objetivo não é apenas adicionar funcionalidades visuais: é construir uma camada de administração comercial capaz de controlar a apresentação das ofertas **sem** comprometer a integridade dos preços, dos pedidos e do checkout.

### 1.1 Princípios obrigatórios

- Reaproveitar a arquitetura existente sempre que tecnicamente adequada.  
- Não duplicar o motor de preços.  
- Separar curadoria de produtos e ativação promocional.  
- Garantir consistência comercial em toda a jornada de compra.  
- Não anunciar condições de pagamento não suportadas.  
- Preservar os pedidos já realizados e seus snapshots.  
- Não alterar componentes críticos sem justificativa técnica comprovada.  
- Executar auditoria antes de definir a implementação.  
- Manter documentação, backlog e matriz oficial organizados.  

---

## 2. Governança e decisões fechadas

### 2.1 Identificação dos pacotes

- Frente organizada em **HOME-01 a HOME-08**.  
- **Não** serão criados novos números AJUSTE neste ciclo.  
- **AJUSTE-035** permanece exclusivo do Checkout.  
- A matriz oficial de ajustes só receberá novos registros depois da definição técnica pós-auditoria e da avaliação de impacto.  

### 2.2 Documentação canônica

| Documento | Papel |
|-----------|--------|
| Este arquivo (`FAL_PLANO_MESTRE_HOME_COMERCIAL_2026-11.md`) | Fonte de referência comercial e arquitetural |
| [FAL_HOME_BACKLOG_01_08.md](./FAL_HOME_BACKLOG_01_08.md) | Fonte de execução e acompanhamento dos pacotes |
| [FAL_SPEC_ONDA3_COMERCIAL_PROMOCOES_2026-11-08.md](./FAL_SPEC_ONDA3_COMERCIAL_PROMOCOES_2026-11-08.md) | Histórico — **SUPERSEDIDA** |

### 2.3 Limite deste ciclo (documental)

**Autorizado:** apenas documentação.

**Não autorizados:**

- Migrations / alterações de banco  
- Novas telas / alterações em componentes de produção  
- Alterações em `resolve_product_price` ou `place_order`  
- Alterações no checkout / implantação de regras de pagamento  
- Execução dos pacotes HOME-02 a HOME-08 (código)  

Auditorias posteriores serão inicialmente **read-only**.

---

## 3. Modelo comercial da Home

Três dimensões independentes:

| Dimensão | Papel |
|----------|--------|
| **Curadoria** | Quais produtos recebem destaque |
| **Oferta / promoção** | Quais produtos estão efetivamente em promoção |
| **Condições comerciais** | Quais preços e condições de pagamento podem ser apresentados |

### 3.1 Distinção obrigatória de conceitos

| Conceito | Significado |
|----------|-------------|
| **Destaques** | Curadoria em `store_home_featured_products` — independente de promoção |
| **Ofertas (rail na Home)** | Seleção **automática** quando `resolvedPrice < listPrice` — **não** é o menu Promoções |
| **Promoções (admin)** | Controle de ativação individual sobre listas de preços existentes — a criar |
| **Pagamentos** | Apresentação alinhada ao que o checkout realmente aplica |

### 3.2 Matriz de estados (destaque × promoção)

| Situação | Destaque | Promoção | Válida? |
|----------|----------|----------|---------|
| A | Sim | Sim | Sim |
| B | Sim | Não | Sim |
| C | Não | Sim | Sim |
| D | Não | Não | Sim |

Regras:

- Promoção **não** insere automaticamente produtos nos destaques.  
- Remoção/expiração de promoção **não** remove o produto dos destaques.  
- Alteração da ordem dos destaques **não** modifica a condição promocional.  

---

## 4. Inventário — Implantado / Parcial / Ausente

Estado observado no repositório em 12/11/2026 (não inventar além disto; auditorias HOME-01/06a aprofundam).

### 4.1 Preços

| Item | Estado | Notas / âncora |
|------|--------|----------------|
| `price_lists` / `price_list_items` / histórico | Implantado | Fase 6B |
| Overrides `product_price_overrides` | Implantado | F6B.1 |
| `resolve_product_price(s)` SQL + TS | Implantado | `priceResolutionService.ts` |
| `attachResolvedPrices` (`listPrice` + `resolvedPrice`) | Implantado | Base fixa conhecida no serviço |
| Admin `/admin/precos` | Implantado | Listas, formação, import |
| Carrinho usa resolve | Implantado | `cartPricing.ts` |
| `place_order` usa resolve + snapshot | Implantado | Migrations place_order |
| Auditoria contratos 022-E0 | Feita (doc) | Read-only |
| F8.5 adicional % | Parcial | UI existe; SQL `…prepared.sql` — validação integral **pendente** |
| Flag “promoção ativa” por produto | Ausente | Resolve usa maior `priority` |

**Fato atual do resolve (hipótese prioritária a confirmar na HOME-01):** override ativo → listas `public`+`active`+vigentes com item, **maior `priority`** → fallback lista Base. Isso **não** equivale, por si só, a ativação comercial individual.

### 4.2 Home / Destaques

| Item | Estado |
|------|--------|
| `store_home_featured_products` + híbrido | Implantado |
| `featured_display_limit` + vigência banners | Implantado |
| Admin Campanhas / Destaques / Pagamento | Implantado (3 abas) |
| Busca, ordem, ligar/remover, limite | Implantado |
| Admin: imagem, preço, selo promo, preview Home | Ausente |
| Menu Promoções / Configurações gerais | Ausente |
| Rail Ofertas automático | Implantado (`listPromoHighlightProducts`) |

### 4.3 Cards / pagamentos

| Item | Estado |
|------|--------|
| Badge “Oferta” + preço riscado | Implantado (`ProductCard`) |
| Linha “em até Nx…” | Implantado (`store_payment_display` + `paymentDisplay`) |
| % desconto explícito / preço PIX no card | Ausente |
| PIX% comercial / faixas de parcelamento | Ausente |
| Cards de pagamento da Home administráveis | Ausente |
| Identidade visual configurável | Ausente |

---

## 5. Área administrativa — Home da Loja

### 5.1 Destaques

Responsável pela curadoria. Preservar:

- `store_home_featured_products`  
- Comportamento híbrido  
- `featured_display_limit`  
- Regras atuais de exibição  

Evoluções desejadas (Frente 2 / HOME-02): visualização rica, ordenação explícita, busca/filtros, indicadores de promoção (informativos), preços normal/promo, prévia desktop/tablet/mobile com **dados reais**.

**Regra inviolável:** administração dos destaques **não** é subordinada ao módulo de promoções.

### 5.2 Promoções

Novo menu administrativo para **ativação comercial individual**.

- Usa listas de preços existentes.  
- **Não** cria segundo cadastro de preços.  
- **Não** permite digitar preço promocional fora da lista.  

**Distinção obrigatória:** lista promocional cadastrada **≠** promoção ativa.

Fluxo esperado: acessar Promoções → ver produtos/listas → selecionar condição → ativar/desativar → vigência opcional → validação → condição efetiva na composição comercial.

Estados operacionais desejados: Inativa · Ativa · Agendada (se arquitetura suportar) · Expirada · Inválida/bloqueada.

Vigência: término opcional; expiração automática quando houver data; preservar cadastro e histórico. **Mecanismo confiável de expiração = decisão pós-HOME-01** (não presumir só ocultar na UI).

Conflitos entre listas: não selecionar silenciosamente condições incompatíveis. Regra explícita pós-auditoria. **Não assumir** que maior `priority` deve sempre vencer como “promoção ativa”.

Informações admin desejadas: produto, SKU, lista, preço normal/promo, % desconto calculado, situação, datas, validade, margem/indicador se existir capacidade.

### 5.3 Pagamentos

Administrar e apresentar condições **reais**.

Hoje `store_payment_display` / `paymentDisplay` cobre, entre outros: máximo de parcelas, valor mínimo da parcela, sem juros, show card/PDP, footnote. Isso **não** é, por si, motor completo de condições.

Evolução parte da capacidade comprovada no checkout e nos meios integrados (auditoria HOME-06a).

**PIX / cartão / outras formas / acumulação / cards:** ver §6; nenhuma regra de acumulação é presumida — respostas explícitas na auditoria.

### 5.4 Configurações gerais

Centralizar apresentação comercial (visibilidade de selos, preços, %, PIX, parcelamento, cards, responsividade, consistência visual).

**Separar** configuração visual de regra comercial. Configurações **não** alteram cálculo nem habilitam condições que o checkout não suporte.

---

## 6. Integração global e pagamentos (visão)

### 6.1 Pontos da jornada

Home · Catálogo · Busca · PDP · Carrinho · Checkout — mesma condição comercial aplicável; checkout é autoridade final; snapshots de pedido preservados; não reescrever histórico ao mudar promoção.

### 6.2 Apresentação quando promo válida

Preço promocional · preço anterior riscado (se comparação válida) · selo · % desconto quando aplicável · condições de pagamento efetivas.

Quando inativa/expirada: não mostrar promo, selo ativo nem strike como se a oferta ainda valesse.

### 6.3 Cálculo

Preços só das fontes oficiais. Não calcular promo “independente” na Home. % a partir de valores válidos e comparáveis.

Pontos a verificar na auditoria: sem preço normal/promo; preços iguais; promo > normal; indisponíveis; mudança de preço em campanha; múltiplas condições.

### 6.4 Pagamentos — perguntas obrigatórias (HOME-06a)

- PIX habilitado? Desconto existe? % ou fixo? Base? Mínimo? Acumula com promoção?  
- Cartão: max parcelas, mínimos, sem/com juros, faixas, capacidade do gateway, tratamento de promocionais.  
- Outras formas: só se habilitadas no checkout.  
- Acumulação: promo+PIX? PIX sobre normal ou promo? Parcelas sem juros em promocionais? Limites por faixa? Por produto/categoria? Gateway cobre o anunciado?  

Cards da Home a partir de condições efetivas — sem texto manual contraditório.

---

## 7. Arquitetura e fontes da verdade

| Informação | Fonte esperada |
|------------|----------------|
| Preços e condições comerciais | Módulo de listas de preços |
| Itens das listas | `price_list_items` |
| Ativação individual promocional | **Mecanismo a definir após HOME-01** |
| Vigência da promoção | **Mecanismo a definir após HOME-01** |
| Seleção e ordem dos destaques | `store_home_featured_products` (+ híbrido) |
| Limite dos destaques | `store_home_settings.featured_display_limit` |
| Apresentação de pagamentos | `store_payment_display` / configs existentes |
| Cálculo final da compra | Checkout / `place_order` |
| Registro histórico | Snapshot do pedido |

### 7.1 Hipótese técnica prioritária (HOME-01)

O resolvedor da Fase 6B seleciona automaticamente a lista `public`+`active` de maior `priority` com item — o que **não** equivale necessariamente a ativação comercial individual.

A auditoria deve comprovar:

1. Como o resolvedor seleciona a lista  
2. Se considera vigência  
3. Como trata múltiplas listas  
4. Ausência de item  
5. Diferenciação preço normal × promocional  
6. Consumidores do resolvedor  
7. Outros mecanismos de formação de preço  
8. Se o checkout usa a mesma lógica  
9. Necessidade real de gate promocional individual  
10. Impacto de qualquer alteração  

**Não alterar `resolve_product_price` nem `place_order` antes de comprovar a necessidade.** Gate novo = consequência da auditoria, não decisão antecipada.

Decisões ainda abertas (PIX acumula, faixas, indisponível vs preço, etc.): **pós-HOME-01 / HOME-06a**.

---

## 8. Três frentes + gate pós-F1

Sequência **obrigatória**:

```text
Frente 1 (Estruturação) → Gate análise pós-F1 → Frente 2 (Refinamento) → Frente 3 (Verificação)
```

A Frente 2 **não** inicia em paralelo à Frente 1.

| Etapa | Conteúdo | Pacotes |
|-------|----------|---------|
| **Frente 1** | Docs, auditorias, estrutura nova (4 áreas, Promoções, integração se necessária, Pagamentos estruturais) | A0 docs · HOME-01 · HOME-06a · HOME-03 · HOME-04* · HOME-06b |
| **Gate pós-F1** | Análise de melhorias, correções e ajustes; doc `FAL_ANALISE_POS_F1_HOME_COMERCIAL_…`; **P0 zerado** | Bloqueia Frente 2 |
| **Frente 2** | Refinamento / usabilidade com backlog do gate | HOME-02 · HOME-05 · HOME-07 · B+ do gate |
| **Frente 3** | Verificação / homologação | HOME-08 · C+ · smokes |

\*HOME-04 somente se HOME-01 comprovar necessidade.

Exceção: auditorias **read-only** (HOME-01, HOME-06a, validação factual F8.5) durante a Frente 1 — **não** autorizam abrir a Frente 2.

### 8.1 Gate pós-F1

Classificar cada achado:

| Classe | Destino |
|--------|---------|
| Correção P0 | Antes de abrir Frente 2 |
| Ajuste Frente 2 | Usabilidade / polish |
| Verificação Frente 3 | Smoke / homologação |
| Adiar | Com motivo explícito |

**Aceite do gate:** documento publicado + priorização aprovada (eFe) + zero P0 aberto.

### 8.2 Reconciliação de ordem de pacotes

IDs HOME-01…08 e dependências permanecem no backlog. Timing operacional:

- **HOME-03** (Promoções) → Frente 1  
- **HOME-02** (Destaques rico) → Frente 2 (após gate)  

---

## 9. Critérios de auditoria e evidências

Toda auditoria é read-only e registra: arquivo/caminho · tabela/objeto · função/serviço · migration · comportamento comprovado · evidência · risco · impacto · recomendação · pendências.

Diferenciar sempre:

- Implementado e comprovado  
- Implementado parcialmente  
- Existente apenas na interface  
- Existente apenas na documentação  
- Não implementado  
- Não comprovado  

Não transformar intenção de negócio em fato técnico. Não presumir que configuração visual está ligada ao cálculo. Não recomendar migration/código sem o problema que resolve.

---

## 10. Cenários críticos de validação

### Destaques

Produto destacado sem/com promoção · promo ativada/desativada em destacado · ordem alterada durante promo · promocional fora dos destaques.

### Promoções

Na lista mas inativo · ativo · com/sem término · expirada · desativada manualmente · duas listas · promo > normal · sem preço normal · lista alterada durante campanha.

### Pagamentos

Sem/com promoção · promo+PIX · promo+cartão · abaixo do mínimo de parcelamento · acima de faixa · condição anunciada indisponível no gateway · desconto incompatível.

### Integridade

Preço alterado após carrinho · promo expirada/desativada na jornada · pedido confirmado com preço válido · alteração posterior da lista · preservação do snapshot.

Para cada cenário: comportamento esperado · comportamento atual · ajustes necessários.

---

## 11. Arquivos-âncora (a confirmar na auditoria)

### Administração

- `fal-pecas/src/pages/admin/home/AdminHomeContentPage.tsx`  
- `fal-pecas/src/services/admin/adminHomeContentService.ts`  
- `fal-pecas/src/lib/paymentDisplay.ts`  
- `fal-pecas/src/services/store/paymentDisplayService.ts`  
- `fal-pecas/src/services/products/productService.ts`  
- `fal-pecas/src/pages/Home/HomePage.tsx`  
- `fal-pecas/src/components/product/ProductCard.tsx`  

### Preços

- Migrations Fase 6B / F6B.1 / F8.5 prepared  
- `fal-pecas/src/services/pricing/priceResolutionService.ts`  
- `fal-pecas/src/pages/admin/prices/*`  
- `fal-pecas/src/services/cart/cartPricing.ts`  

### Pagamentos / checkout

- `store_payment_display`  
- Serviços de pagamento / MP / Checkout (AJUSTE-035 — não misturar escopo)  

### Documentação

- Spec Onda 3 (supersedida) · F8.5 · F8 mestre · Matriz AJUSTEs · Ondas Home 2–4  

---

## 12. Resultado esperado deste ciclo documental

- Plano mestre canônico (este arquivo)  
- Backlog HOME-01…08  
- Spec Onda 3 identificada como supersedida  
- Dependências, aceites, hipóteses e fronteiras de escopo documentados  
- Próximas auditorias definidas  

**Nenhuma implantação deve ser considerada realizada.**

---

## 13. Próximo ciclo

1. ~~**HOME-01**~~ — **DONE** [FAL_AUDITORIA_HOME_01_PRECOS_2026-11-12.md](./FAL_AUDITORIA_HOME_01_PRECOS_2026-11-12.md)  
2. ~~**HOME-06a**~~ — **DONE** [FAL_AUDITORIA_HOME_06_PAGAMENTOS_2026-11-12.md](./FAL_AUDITORIA_HOME_06_PAGAMENTOS_2026-11-12.md)  
3. ~~**Consolidar achados**~~ — **DONE** [FAL_SPEC_HOME_CONSOLIDACAO_GATE_PAG_2026-11-12.md](./FAL_SPEC_HOME_CONSOLIDACAO_GATE_PAG_2026-11-12.md) (Opção A + P0 pagamentos; **sem código**)  
4. ~~Implementação HOME-06b P0 + HOME-03 gate~~ — **DONE** [FAL_MARCHA_HOME_F1_P0_GATE_VAL_2026-11-12.md](./FAL_MARCHA_HOME_F1_P0_GATE_VAL_2026-11-12.md)  
5. ~~Apply migration + Edge~~ — **DONE** [FAL_MARCHA_HOME_F1_APPLY_SMOKE_VAL_2026-11-12.md](./FAL_MARCHA_HOME_F1_APPLY_SMOKE_VAL_2026-11-12.md) (smoke UI promo pendente massa)  
6. ~~HOME-04 smoke gate resolve~~ — **DONE** [FAL_MARCHA_HOME_04_GATE_SMOKE_VAL_2026-11-12.md](./FAL_MARCHA_HOME_04_GATE_SMOKE_VAL_2026-11-12.md)  
7. ~~**Gate pós-F1**~~ — **DONE** [FAL_ANALISE_POS_F1_HOME_COMERCIAL_2026-11-12.md](./FAL_ANALISE_POS_F1_HOME_COMERCIAL_2026-11-12.md)  
8. **Frente 2:** HOME-02 (Destaques + aviso lista inactive) → HOME-05 → HOME-07  
9. Adiado: PIX%/faixas (06b-2) · F8.5 integral  
10. Frente 3: smoke UI jornada + HOME-08  

**Diretriz final:** evoluir a capacidade comercial da FAL sem comprometer a arquitetura existente, a integridade dos preços, a consistência da jornada de compra ou a estabilidade do checkout.
