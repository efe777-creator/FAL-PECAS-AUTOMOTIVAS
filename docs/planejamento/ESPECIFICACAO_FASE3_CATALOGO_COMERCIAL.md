# Especificação — Fase 3: Catálogo e Estrutura Comercial Real

**Status:** Implementada — ver [EXECUCAO_FASE3.md](./EXECUCAO_FASE3.md) e [AUDITORIA_FASE3_2026-10-03.md](./AUDITORIA_FASE3_2026-10-03.md)  
**Data:** 2026-10-03  
**Branch de trabalho:** `plan`  
**Base:** [DATABASE.md](../entrada/DATABASE.md), [ARCHITECTURE.md](../entrada/ARCHITECTURE.md), [API.md](../entrada/API.md), [UX.md](../entrada/UX.md), [IMPORT.md](../entrada/IMPORT.md), [FAL_PRD_3.0.md](../entrada/FAL_PRD_3.0.md)  
**Fase anterior:** [ESPECIFICACAO_FASE2_ARQUITETURA_DADOS.md](./ESPECIFICACAO_FASE2_ARQUITETURA_DADOS.md), [AUDITORIA_FASE2_2026-10-03.md](./AUDITORIA_FASE2_2026-10-03.md)  
**Roadmap:** [ROADMAP_FASES_3.0.md](./ROADMAP_FASES_3.0.md)

**Nota histórica:** este documento nasceu como spec-only; a implementação modular (M1–M12) foi executada após aprovação.

---

## 1. Objetivo da Fase 3

Construir o **catálogo comercial real** e o **primeiro núcleo administrativo (backoffice de catálogo)** da FAL, evoluindo o schema e os services da Fase 2 — sem reconstruir o sistema.

A Fase 3 responde: *como a FAL administra e publica o conteúdo que realmente quer vender?*

Não é apenas “inserir produtos”. É tornar administráveis categorias, veículos, fabricantes, referências, aplicações e imagens, com o catálogo público consumindo esses dados.

---

## 2. Escopo

### Implementar (após aprovação desta spec)

- Evolução mínima do schema (campos e índices justificados)
- Storage de imagens de produto + policies
- Carga/admin dos dados comerciais (categorias, 22 montadoras, modelos/versões conforme fonte, fabricantes, fornecedores, produtos, refs, aplicações, imagens)
- Backoffice `/admin` focado em **Catálogo**
- CRUD: Produtos, Categorias, Montadoras, Modelos/Veículos, Fabricantes, Fornecedores (mínimo), Referências (via produto)
- Catálogo público consumindo dados reais (sem hardcode comercial)
- Filtros combináveis (texto, código/ref, categoria, veículo progressivo)
- Busca por SKU e por qualquer referência

### Preparar (sem implementação completa)

- Vendas / Pedidos / Clientes (menu placeholder)
- Estoque operacional / Relatórios
- Importador Excel/CSV completo (manter compatível com [IMPORT.md](../entrada/IMPORT.md))
- Veículos salvos do cliente (já existe `customer_vehicles` — contratos de uso na loja = Fase 5)
- Busca por placa (modelo não impede; sem integração)

---

## 3. Fora do escopo

- Checkout, pagamento, frete
- Pedidos completos / operação de separação
- App mobile
- Microserviços / troca de stack
- Importação automática do PDF de movimentação
- Inventar aplicações, anos, motores ou referências
- Colunas `codigo_nakata` / `codigo_cofap` etc.
- Motor EAV complexo de atributos
- Consulta real de placa
- Reabrir Fase 2 por advisors de `is_staff` / leaked password (hardening futuro)

---

## 4. Estado atual da Fase 2

### 4.1 Tabelas relevantes (já aplicadas)

| Tabela | Papel |
|--------|--------|
| `product_categories` | Árvore (`parent_id`), `sort_order`, `status` |
| `product_brands` | Fabricante de peça (≠ montadora) |
| `manufacturers` | Montadoras |
| `models` | Modelos por montadora |
| `vehicle_versions` | Configuração: `year`, `engine`, `version_name` (nullable) |
| `products` | Item comercial; `is_available`, `is_incomplete`, `status` |
| `product_references` | Códigos (`code`, `ref_type`, `brand_label`) |
| `product_vehicle_compatibility` | N:N produto ↔ versão |
| `product_images` | Metadata de mídia (`storage_path`, `is_primary`) |
| `suppliers` / `supplier_products` | Fornecedores |
| `inventory` / `inventory_movements` | Saldo + sync de disponibilidade |
| `customer_vehicles` | Veículos salvos (preparado) |
| `imports` / `import_items` | Pipeline futuro |

### 4.2 Seed estrutural atual (não é catálogo comercial)

- Raiz: Suspensão e Direção | Fluidos | Filtros  
- Subs: Axial, Bandeja, Bieleta, Pivô, Terminal; Óleo do motor; Fluido de freio; Filtros óleo/ar  
- 3 montadoras (Fiat, Chevrolet, Volkswagen) + 3 modelos + 3 versões  
- 2 produtos fixture + refs + aplicações  

### 4.3 Frontend / gaps

- Loja lê Supabase via services (`categoryService`, `productService`, `vehicleService`)
- Catálogo público já tem busca/filtros básicos
- **Não existe** rota `/admin` nem CRUD administrativo
- Storage de imagens **não** configurado (só coluna `storage_path`)
- Mocks ainda existem como fallback sem env

### 4.4 RLS (preservar)

- Catálogo published: leitura `anon` / `authenticated` sem chamar `is_staff()` nas policies públicas
- Staff: policies `TO authenticated` + `is_staff()`
- Quantidade de estoque: não pública; loja usa `is_available`

---

## 5. Princípios arquiteturais

1. Produto ≠ veículo.  
2. Produto ↔ veículo = **N:N** (`product_vehicle_compatibility`).  
3. Não duplicar produto por aplicação.  
4. Não inventar compatibilidade.  
5. Fabricante (`product_brands`) ≠ Fornecedor (`suppliers`) ≠ Montadora (`manufacturers`).  
6. Referências em tabela própria — nunca colunas por marca.  
7. Categorias e montadoras = dados admin, não hardcode React.  
8. Preferir inativação a exclusão física.  
9. Evoluir Fase 2; não recriar banco.  
10. Camadas: Component → Hook/Context → Service → Supabase (anon) → Postgres.  
11. Sem `service_role` no frontend.  
12. Prioridade: modelagem correta > clareza > escalabilidade > simplicidade > velocidade.

Fluxo:

```text
UI (loja ou /admin)
  → hooks / contexts
  → services/*
  → lib/supabase.ts (anon + JWT)
  → Postgres + RLS (+ Storage)
```

---

## 6. Conceitos de domínio

| Conceito | Definição | Tabela F2 |
|----------|-----------|-----------|
| **CATEGORIA** | Classifica o tipo do produto (pai/filha) | `product_categories` |
| **PRODUTO** | Item comercial vendido pela FAL | `products` |
| **FABRICANTE** | Quem fabrica a peça | `product_brands` |
| **FORNECEDOR** | Quem fornece à FAL | `suppliers` |
| **REFERÊNCIA** | Código de identificação (OEM, fabricante, concorrente…) | `product_references` |
| **MONTADORA** | Marca do veículo (Fiat, VW…) | `manufacturers` |
| **MODELO** | Modelo do veículo (Palio, HB20…) | `models` |
| **VEÍCULO** | Configuração estruturada (ano/motor/versão) | `vehicle_versions` |
| **APLICAÇÃO** | Ligação produto compatível com configuração | `product_vehicle_compatibility` |
| **IMAGEM** | Arquivo/mídia do produto | `product_images` + Storage |

**Glossário UI (obrigatório):** nunca chamar montadora de “marca do carro”; nunca chamar fabricante de peça de “montadora”.

---

## 7. Estrutura de categorias

Árvore **inicial de negócio** (fonte de verdade no banco após implementação):

1. **Suspensão** — Pivô, Bandeja, Buchas, Coxins, Batentes, Amortecedores e kits  
2. **Direção** — Terminal de direção, Axial, Componentes relacionados  
3. **Óleos e Fluidos** — Óleo de motor, Fluido de freio, Fluido de arrefecimento, Outros fluidos  
4. **Freios** — Pastilhas, Componentes relacionados  
5. **Filtros** — Óleo, Ar, Combustível, Cabine/ar-condicionado  
6. **Componentes de manutenção** — Velas, Correias, Tensores, Outros  
7. **Outro**

Campos já suportados: `parent_id`, `name`, `slug`, `description`, `sort_order`, `status` (`draft`/`published`/`archived`).

**Conflito com seed F2:** “Suspensão e Direção” unificada no seed → na F3 separar Suspensão e Direção. Substituir seed; não hardcodar no React.

---

## 8. Estrutura de montadoras

Lista inicial (documentada; **não inserir nesta etapa**):

Audi, BMW, BYD, CAOA Chery, Chevrolet, Citroën, Fiat, GWM, Honda, Hyundai, Jaguar, Jeep, Land Rover, Mercedes-Benz, Mitsubishi, Nissan, Peugeot, RAM, Renault, Suzuki, Toyota, Volkswagen.

Tabela: `manufacturers` (`name`, `slug`, `status` active/inactive).

Índices: unique(`slug`), busca por `name`.

---

## 9. Estrutura de veículos

Hierarquia conceitual:

```text
MONTADORA → MODELO → ANO → MOTOR → VERSÃO
```

### Decisão F3 (reuso)

**Manter** `vehicle_versions` com campos `year`, `engine`, `version_name` nullable.

Justificativa:

- Já atende filtros progressivos e parciais na busca (F2).
- Evita explosão de tabelas de dimensão sem ganho imediato.
- Escala com índices compostos existentes.

Não criar `vehicle_years` / `vehicle_engines` separados nesta fase.

### Aplicações parciais (estratégia)

Fonte pode informar só “Fiat Palio 1.0” sem ano/versão.

**Não inventar anos.**

Representação:

- Criar/usar linha em `vehicle_versions` com `manufacturer_id` + `model_id` preenchidos e `year` / `engine` / `version_name` **NULL** onde a informação não existe.
- Aplicação aponta para esse `vehicle_version_id`.
- Na busca: filtros preenchidos restringem; campos omitidos não exigem match (já comportamento parcial).

**Matching na loja (regra):**

- Se o usuário filtrar Ano=2012, versões com `year IS NULL` **não** entram como match automático amplo sem decisão futura de “wildcard”.
- **Decisão F3 (pragmática):** match exige igualdade nos campos **preenchidos no filtro**; versão com NULL naquele campo **não satisfaz** filtro específico (evita falso positivo). Admin deve cadastrar aplicações específicas quando a fonte tiver o dado.

Se no futuro o negócio quiser “NULL = qualquer”, documentar mudança explícita (risco de contaminação).

### Preparação para placa

`vehicle_versions.id` permanece o alvo estável. Futuro: `plate_lookup → vehicle_version_id → applications → products`. Sem integração agora.

---

## 10. Estrutura de produtos

### Identificação

| Campo | Tabela | Notas |
|-------|--------|-------|
| `sku` | `products` | Único operacional (upsert import) |
| `name`, `slug` | `products` | |
| `status` | `products` | `draft` / `published` / `archived` |

### Classificação

| Campo | Notas |
|-------|--------|
| `category_id` | Preferir subcategoria (folha) quando existir |

### Comercial

| Campo | Notas |
|-------|--------|
| `price`, `promo_price` | |
| `is_available` | Espelho público do inventário |

### Origem

| Campo | Proposta F3 |
|-------|-------------|
| `brand_id` | Fabricante (já existe) |
| `supplier_id` | **Novo** FK opcional → `suppliers` (fornecedor atual) |
| `supplier_products` | Mantido para múltiplos fornecedores / custo futuro |

### Descrição

| Campo | Proposta F3 |
|-------|-------------|
| `short_description` | **Novo** text nullable |
| `description` | Descrição completa (já existe) |

### Relacionamentos

- N refs, N aplicações, N imagens  
- `attrs jsonb` default `{}` (atributos leves — §17)  
- `is_incomplete` quando faltar imagem ou dados críticos  

### Soft delete

Não introduzir `deleted_at` na F3. Usar `archived` / `inactive`. Exclusão física só se sem histórico de pedido/import crítico (regra admin).

---

## 11. Fabricantes

Tabela: `product_brands` (`name`, `slug`, `status`).

Exemplos futuros: Nakata, Cofap, Motorasa, Yiming.

Admin CRUD na F3. Loja lê apenas ativos ligados a produtos published.

---

## 12. Fornecedores

Tabela: `suppliers` + `supplier_products`.

- Produto: `supplier_id` opcional (fornecedor atual).  
- Evolução: vários fornecedores via `supplier_products` sem quebrar o produto.  
- HF = possível `supplier` futuro (decisão de integração permanece aberta).

Admin mínimo: listar/criar/editar fornecedor; vincular no formulário de produto.

---

## 13. Referências

```text
PRODUTO → N REFERÊNCIAS
```

Tabela `product_references` — evolução proposta:

| Campo | Ação |
|-------|------|
| `code` | Mantém; índice |
| `ref_type` | Mantém (`manufacturer`, `oem`, `internal`, `competitor`, `other`) |
| `brand_label` | Mantém (texto livre legado) |
| `brand_id` | **Novo** FK opcional → `product_brands` |
| `status` | **Novo** `active` / `inactive` |
| unique (`product_id`, `code`, `ref_type`) | Mantém |

Busca por qualquer `code` ativo deve achar o produto (já iniciado em `productService.searchProducts`).

**Proibido:** `codigo_nakata`, `codigo_cofap`, etc.

---

## 14. Aplicações produto × veículo

Tabela existente: `product_vehicle_compatibility`  
(`product_id`, `vehicle_version_id`, `notes`, unique composto).

Regras:

- N:N verdadeiro  
- Granularidade = o que a fonte informa (via versão parcial ou completa)  
- Palio 1.0 Fire ≠ qualquer Palio  
- Um produto, várias aplicações; um veículo, vários produtos  

Nome de domínio na UI admin: **Aplicações** (tabela pode manter nome técnico F2).

---

## 15. Imagens

`product_images`: `storage_path`, `alt`, `sort_order`, `is_primary`.

**Proposta F3:**

- Bucket Storage `product-images` (público leitura de published; escrita staff)
- Produto **pode** existir sem imagem (`is_incomplete = true`, WARNING em import)
- Admin: upload, definir principal, ordenar, listar “sem imagem”

---

## 16. Status

| Entidade | Valores |
|-----------|---------|
| Produtos / categorias | `draft`, `published`, `archived` |
| Montadoras / modelos / versões / marcas / fornecedores / refs | `active`, `inactive` |

Mapeamento mental ACTIVE/INACTIVE:

- Loja: só `published` + entidades `active`  
- Admin: vê drafts/archived conforme role  

Preferir inativar. Delete físico: só entidades sem FK de histórico (confirmação UI).

---

## 17. Atributos específicos

**Não** criar EAV completo na F3.

**Proposta pragmática:** `products.attrs jsonb DEFAULT '{}'::jsonb`

- Uso opcional (ex.: `{"lado":"direito","eixo":"dianteiro"}`)  
- Sem formulário dinâmico por categoria na F3  
- Campos universais ficam nas colunas tipadas; o restante em `attrs` ou descrição  
- Evolução futura: schema por categoria sem migration destrutiva  

---

## 18. Busca

| Tipo | Comportamento F3 |
|------|------------------|
| Textual | `name`, `search_document`, descrição curta |
| SKU | match direto |
| Referência | `product_references.code` |
| Categoria | filtro por `category_id` (inclui filhos da raiz) |
| Fabricante | `brand_id` |
| Veículo | via compatibilidade + versões |

FTS/ranking avançado = **Fase 4** (melhoria). F3 garante funcionamento correto com `ilike` + joins/índices.

Índices relevantes (propostos / existentes):

| Índice | Justificativa |
|--------|----------------|
| `products.sku` unique | Upsert / busca código interno |
| `products.slug` unique | URL |
| `products(status)` | Listagens públicas |
| `product_references(code)` | Busca por ref |
| `product_categories(parent_id)`, unique slug | Árvore |
| `vehicle_versions(manufacturer_id, model_id, year, engine)` | Filtros |
| `pvc(product_id)`, `pvc(vehicle_version_id)` | Join aplicações |
| opcional: `gin(attrs)` só se uso real justificar | Não criar na F3 sem necessidade |

---

## 19. Filtros

### Regras

- **Dentro do mesmo grupo:** OR (ex.: Fiat OR Volkswagen)  
- **Entre grupos:** AND (ex.: Suspensão AND (Fiat OR VW))  
- Nenhum campo de veículo obrigatório  
- Progressivo: Montadora → Modelo → Ano → Motor → Versão  

### Grupos

1. Texto / código  
2. Categoria (multi no futuro; F3 pode iniciar single + filhos)  
3. Fabricante  
4. Veículo (campos progressivos)  
5. Status (só admin)

---

## 20. Veículo salvo

Tabela `customer_vehicles` já existe (FKs opcionais + nickname).

Fase 3: **não** desenvolver UX completa de conta (Fase 5).

Contrato futuro: “Ver peças para meu veículo” → resolve `version_id` ou conjunto de filtros → mesma lógica de aplicações (sem match só por nome de modelo).

---

## 21. Preparação para placa

- Identificador estável: `vehicle_versions.id`  
- Futuro serviço: placa → configuração → `vehicle_version_id`  
- Sem API externa, sem mock de placa na F3  

---

## 22. Backoffice

```text
FAL ADMIN
├── Dashboard (placeholder)
├── Catálogo          ← IMPLEMENTAR
│   ├── Produtos
│   ├── Categorias
│   ├── Montadoras
│   ├── Modelos / Veículos
│   ├── Fabricantes
│   ├── Fornecedores (mínimo)
│   └── Referências (via produto; lista global opcional)
├── Vendas            ← PREPARAR
│   ├── Pedidos
│   └── Clientes
├── Estoque           ← PREPARAR
└── Relatórios        ← PREPARAR
```

Rotas sugeridas: `/admin`, `/admin/produtos`, `/admin/categorias`, etc.  
Guard: sessão + `profiles.role` ∈ staff (`is_staff`).

**Nota roadmap:** adianta parte da Fase 8 apenas para catálogo; operação completa permanece nas Fases 7–8.

---

## 23. Fluxos administrativos

### Produto (criar/editar) — blocos/abas

1. **Geral** — nome, SKU, categoria, fabricante, fornecedor, status  
2. **Comercial** — preço, promo, disponibilidade (via inventário ou flag admin)  
3. **Referências** — N códigos  
4. **Aplicações** — seleção progressiva Montadora→…→Versão; adicionar/remover  
5. **Imagens** — upload, principal, ordem  
6. **Descrição** — curta / completa  

### Aplicação

Adicionar → selects progressivos → salvar vínculo. Campos opcionais conforme dado disponível.

### Categoria / Montadora / Modelo / Versão / Fabricante

CRUD simples: listar, buscar, criar, editar, ativar/inativar.

### Confirmações

Ações destrutivas (delete físico) exigem confirmação. Inativar é o caminho padrão.

---

## 24. Contratos tela ↔ dados

| Tela | Consome | Altera | Service | Permissão | Estado esperado |
|------|---------|--------|---------|-----------|-----------------|
| Catálogo público | products, categories, refs, availability | — | `productService`, `categoryService` | público | grid + filtros |
| Busca header | products + refs | — | `productService.searchProducts` | público | sugestões / catálogo |
| Produto público | product, refs, apps, images | — | `productService.getProductById` | público | detalhe |
| Filtro veículo | manufacturers, models, versions | — | `vehicleService` | público | selects progressivos |
| Admin Produtos lista | products (+joins) | status | `admin/productService` | staff | tabela + filtros |
| Admin Produto form | product, refs, apps, images, brands, suppliers, categories | CRUD | `admin/*` | staff | abas |
| Admin Categorias | product_categories | CRUD | `admin/categoryService` | staff | árvore |
| Admin Montadoras | manufacturers | CRUD | `admin/manufacturerService` | staff | lista |
| Admin Veículos | models, vehicle_versions | CRUD | `admin/vehicleService` | staff | hierarquia |
| Admin Fabricantes | product_brands | CRUD | `admin/brandService` | staff | lista |
| Admin Referências | product_references | CRUD (ou embutido) | `admin/referenceService` | staff | lista / por produto |

Services admin **não** usam `service_role` no browser; apenas JWT + RLS staff.

---

## 25. Regras de negócio

1. SKU único; upsert de import por SKU.  
2. Um produto, N aplicações e N referências.  
3. Não inventar aplicação.  
4. Produto sem imagem permitido; sinalizar incompleto.  
5. Loja: só `published` + `is_available` informativo.  
6. Preço promocional opcional.  
7. Inativar > excluir.  
8. Filtro veículo: AND entre dimensões preenchidas; sem obrigatoriedade.  
9. Fabricante ≠ fornecedor ≠ montadora.  
10. WhatsApp não é canal principal de venda (PRD).  

---

## 26. RLS / permissões

### Preservar

- Policies públicas de catálogo por `status`  
- Staff write `TO authenticated` + `is_staff()`  
- Inventário quantidade só staff  

### Estender na implementação (documentar, não aplicar agora)

- INSERT/UPDATE staff em categorias, brands, manufacturers, models, versions, products, refs, images, suppliers (já parcialmente coberto)  
- Storage: leitura pública de objetos de produtos published; upload staff  
- Garantir que novas colunas não quebrem policies existentes  

### Roles

`administrador`, `gerente`, `operador`, `estoque`, `atendimento` — todos `is_staff()` para catálogo na F3 (refinar permissões finas depois se necessário).

---

## 27. Estratégia de dados iniciais

**Ordem pós-aprovação:**

1. Migrations de schema (alterações §29)  
2. Storage bucket  
3. Substituir árvore de categorias (negócio §7)  
4. Cadastrar 22 montadoras  
5. Modelos/versões conforme fonte confiável (sem inventar)  
6. Fabricantes / fornecedores mínimos  
7. Produtos reais (volume inicial controlado) + refs + aplicações + imagens  
8. Remover/arquivar fixtures seed F2 da loja  

**PDF** `RELATORIO MOVIMENTAÇÃO…`: referência de domínio (produto com múltiplas aplicações). **Não** importar automaticamente nesta fase.

---

## 28. Estratégia de importação

Compatível com [IMPORT.md](../entrada/IMPORT.md):

```text
Upload → leitura → validação → preview → correção → confirmação → upsert → relatório
```

- Chave: **SKU** (existe → update; não → create)  
- Erro crítico → bloqueia linha  
- Aviso (ex.: sem imagem) → permite + registra  
- F3: manter tabelas `imports`/`import_items`; UI completa do importador pode ficar para etapa seguinte dentro do admin, **sem** bloquear CRUD manual  

---

## 29. Alterações propostas no banco

### Reutilizar sem mudança estrutural

`product_categories`, `manufacturers`, `models`, `vehicle_versions`, `product_vehicle_compatibility`, `inventory*`, `customer_vehicles`, `imports*`

### Alterar

| Objeto | Mudança |
|--------|---------|
| `products` | + `short_description text` |
| `products` | + `supplier_id uuid NULL REFERENCES suppliers(id)` |
| `products` | + `attrs jsonb NOT NULL DEFAULT '{}'` |
| `product_references` | + `brand_id uuid NULL REFERENCES product_brands(id)` |
| `product_references` | + `status text NOT NULL DEFAULT 'active'` |

### Criar (infra)

- Bucket Storage `product-images` + policies  
- Índices adicionais só se ausentes (refs.code já indexado)

### Não criar na F3

- Tabelas de dimensão ano/motor  
- EAV de atributos  
- `codigo_*` por fabricante  
- Tabelas de placa  

### RLS

Revisar grants/policies após ADD COLUMN (geralmente herdadas). Storage policies novas.

---

## 30. Alterações propostas no frontend

| Área | Mudança |
|------|---------|
| Rotas | `/admin/*` + `AdminLayout` + `StaffRoute` |
| Services | pasta `services/admin/*` para writes; loja continua `services/*` |
| Catálogo público | Consumir categorias/produtos reais; remover mocks como fonte de verdade quando env configurado |
| Produto público | Galeria a partir de Storage URLs |
| VehicleSelector | Expor Versão quando houver `version_name` |
| Types | Alinhar `Product` com `shortDescription`, `attrs`, `supplierId` |
| Nav/Home | Sem hardcode de categorias/montadoras |

Identidade visual: seguir [IDENTIDADE_VISUAL.md](../entrada/IDENTIDADE_VISUAL.md).

---

## 31. Critérios de aceite

| ID | Critério |
|----|----------|
| CA-01 | É possível criar categoria |
| CA-02 | É possível criar subcategoria (`parent_id`) |
| CA-03 | É possível criar montadora |
| CA-04 | É possível criar modelo ligado à montadora |
| CA-05 | É possível criar configuração de veículo (versão) |
| CA-06 | É possível criar produto |
| CA-07 | Produto pode ter múltiplas referências |
| CA-08 | Produto pode ter múltiplas aplicações |
| CA-09 | Uma configuração de veículo pode ter vários produtos |
| CA-10 | Produto pode existir sem imagem |
| CA-11 | Produto pode ser inativado (`archived`) |
| CA-12 | Produto encontrado por SKU |
| CA-13 | Produto encontrado por referência (ex.: PVI1032) |
| CA-14 | Catálogo filtrável por categoria |
| CA-15 | Catálogo filtrável por montadora |
| CA-16 | Filtros de veículo combináveis e parciais |
| CA-17 | Aplicação específica não contamina outro veículo |
| CA-18 | Público não lê quantidade de estoque nem drafts |
| CA-19 | `/admin` exige autenticação staff |
| CA-20 | Categorias/montadoras não são fonte de verdade hardcoded |
| CA-21 | Fabricante e fornecedor são cadastros distintos |
| CA-22 | Upload de imagem e definição de principal funcionam |
| CA-23 | Seleção progressiva de aplicação no admin funciona |
| CA-24 | Produto publicado aparece na loja; arquivado some |
| CA-25 | Seed fixture F2 não permanece como catálogo “real” da loja |

---

## 32. Critérios de saída da Fase 3

A Fase 3 só fecha quando:

- [ ] Schema evolutivo aplicado e documentado  
- [ ] Storage de imagens operacional  
- [ ] Backoffice de catálogo funcional (CRUD listados)  
- [ ] Categorias administráveis (árvore de negócio)  
- [ ] Montadoras administráveis (lista inicial carregável)  
- [ ] Veículos (modelo/versão) administráveis  
- [ ] Fabricantes e fornecedores administráveis  
- [ ] Produtos, referências, aplicações e imagens administráveis  
- [ ] Catálogo público consome dados reais  
- [ ] Filtros e busca por produto/código funcionam  
- [ ] Relação produto × veículo validada (casos específicos)  
- [ ] RLS validada (público vs staff)  
- [ ] Sem dados comerciais críticos hardcoded  
- [ ] Critérios CA principais passando em teste manual  

---

## 33. Riscos

| Risco | Mitigação |
|-------|-----------|
| Contaminação por aplicações NULL demais | Match estrito: NULL não satisfaz filtro específico |
| Ambiguidade fabricante/montadora | Glossário + labels UI fixos |
| Admin antecipar Fase 8 demais | Escopo só Catálogo; resto placeholder |
| Volume de aplicações | Índices pvc; evitar N+1 nos services |
| Storage mal configurado | Policies explícitas; nunca service_role no client |
| Import prematuro | CRUD manual primeiro; import depois |
| Substituir seed quebrando demos | Arquivar fixtures; migration de dados controlada |

---

## 34. Decisões pendentes (validação humana)

1. Confirmar árvore de categorias do §7 como carga oficial.  
2. Confirmar lista das 22 montadoras (grafia: CAOA Chery, Mercedes-Benz, etc.).  
3. Confirmar regra de match: versão com campo NULL **não** atende filtro específico (recomendado).  
4. Fonte oficial dos modelos/anos/motores/versões (manual vs planilha vs PDF só como referência).  
5. Volume inicial de produtos reais na primeira carga.  
6. Se `supplier_id` no produto basta ou exigir sempre `supplier_products`.  
7. Quem recebe role `administrador` no go-live do `/admin`.  
8. Momento do importador UI (ainda na F3 ou imediatamente após CRUD).  
9. Atualizar roadmap §Fase 8 para refletir que catálogo admin foi adiantado na F3.  

---

## Resumo executivo (pós-análise)

### Encontrado na F2

Schema completo o suficiente para o domínio; loja já lê banco; RLS pública corrigida; seed só estrutural; **sem admin**.

### Tabelas existentes relevantes

`product_categories`, `product_brands`, `manufacturers`, `models`, `vehicle_versions`, `products`, `product_references`, `product_vehicle_compatibility`, `product_images`, `suppliers`, `supplier_products`, `inventory`, `customer_vehicles`.

### Provavelmente necessárias / alterações

- Colunas novas em `products` e `product_references`  
- Bucket Storage  
- Rotas/services `/admin`  
- Sem novas tabelas de dimensão de veículo  

### Alterações propostas

Ver §29–30.

### Riscos de modelagem

Ver §33 (especialmente aplicações parciais e glossário fabricante/montadora).

### Migrations nesta etapa

**Nenhuma migration foi executada.**

---

**Próximo passo:** validação humana desta especificação → só então prompt de implementação na branch `plan` (migrations + admin + carga).
