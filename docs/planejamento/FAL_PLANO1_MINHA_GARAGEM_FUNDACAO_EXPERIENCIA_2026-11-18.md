# FAL — PLANO 1 · Minha Garagem — Fundação e experiência inicial

**Projeto:** FAL — Plataforma de Peças Automotivas  
**Escopo:** Minha Garagem — Fundação e experiência inicial  
**Data:** 2026-11-18  
**Branch de implementação futura:** `dev` exclusivamente (`main` = produção)  
**Natureza deste documento:** Análise, auditoria e planejamento técnico — **sem implementação nesta entrega**  
**Workspace auditado:** `C:\Users\user\repos\FAL-PECAS-AUTOMOTIVAS\fal-pecas` (código em `dev`, pós-PLANO 0)

**Relacionados:**

- [FAL_PLANO0_FUNDACAO_CADASTRO_PLACA_2026-11-17.md](./FAL_PLANO0_FUNDACAO_CADASTRO_PLACA_2026-11-17.md) — fundação placa/garagem progressiva (**fechada com residuals**)
- [FAL_PLANO0_RESIDUALS_POS_FUNDACAO_2026-11-18.md](./FAL_PLANO0_RESIDUALS_POS_FUNDACAO_2026-11-18.md) — R1 update, R7 dedup, R2/R3 Edge/snapshot
- [FAL_GARAGE_VISAO_FUNCIONAL.md](../futuro/FAL_GARAGE_VISAO_FUNCIONAL.md) — direção de produto (Garage 1+)
- [VAL-placa-filtros-veiculo.md](../../fal-pecas/docs/VAL-placa-filtros-veiculo.md) — evidências smoke placa/flush
- [FAL_AUDITORIA_GARAGEM_PLACA_V1.md](./FAL_AUDITORIA_GARAGEM_PLACA_V1.md) — **supersedida** pelo PLANO 0 + este PLANO 1 (diagnósticos “sem VV não salva” estão obsoletos)

---

## 0. Escopo desta entrega (planejamento)

| Faz | Não faz |
|-----|---------|
| Diagnóstico do código/schema atuais | Alterar código, banco, migrations, Edge |
| Arquitetura, dados, UX, segurança, testes | Commits de feature, push de app, PR, deploy |
| Etapas G0–G8 de implementação futura | Planejamento 2 (3D, oficinas, manutenção avançada) |
| Separar reaproveitar / corrigir / desenvolver / futuro | Reconstrução desnecessária do que já funciona |

---

## 1. Diagnóstico do estado atual

### 1.1 O que já funciona (PLANO 0 + seed)

| Capacidade | Evidência |
|------------|-----------|
| Consulta placa → mestre (`source=plate`) | Edge `plate-lookup` → `vehicleCanonicalUpsert` → RPC `upsert_vehicle_canonical` |
| Confirmação editável + filtros catálogo | `VehiclePlateSearch`, `VehiclePlateConfirmation`, `VehicleSelector` |
| Save progressivo na garagem (sem `version_id`) | `ensureSavedVehicleFromFilter`, `addSavedVehicle`; migration `20261118010000_customer_vehicles_progressive_text.sql` |
| Listagem de incompletos | `listSavedVehicles` **não** filtra `version_id` null |
| Pending anônimo + flush pós-login | `pendingGarage.ts`, `GarageAskPrompt`, `PendingGarageFlush`, `resolveAuthReturnPath` |
| Conta seed `/conta/veiculos` | `AccountVehiclesPage` — add manual, primary, remove, link catálogo |
| Home “Meus carros” | `HomeVehiclesPanel` + aba Home |
| Quick pick no catálogo | `SavedVehiclesQuickPick` |
| PVC no catálogo + empty state | `search_products` + copy “Veículo reconhecido — sem peças compatíveis” |
| RLS dono | policy `cvehicles_all_own` |
| Design System loja/conta | tokens `fal-*`, `AccountLayout`, `MainLayout`, `MobileNav` |

### 1.2 Divergências vs experiência desejada (PLANO 1)

```
Hoje                              Alvo PLANO 1
────                              ────────────
Lista/form admin-like na conta    Dashboard híbrido + página do veículo
Só is_primary + URL no catálogo   Veículo ativo (contexto) ≠ principal (cadastro)
Insert-only                       Update progressivo + dedup placa
Sem cor/foto/galeria              Personalização + Storage + stock com confiança
Sem vínculo cart/order            Snapshot veículo + histórico eventos
Compat = apps estáticas / filtro  3 estados: confirmada / provável / não confirmada
```

### 1.3 Confirmação: a placa enriquece o cadastro?

| Camada | Enriquecida pela placa? |
|--------|-------------------------|
| Mestre (`manufacturers` / `models` / `vehicle_versions`) | **Sim** — na Edge, na consulta |
| Garagem (`customer_vehicles`) | **Sim** — após “Sim, salvar” + auth; **não** cria mestre |
| PVC | **Não** (proposital) |

---

## 2. Inventário de funcionalidades existentes

### 2.1 Frontend

| Área | Paths |
|------|-------|
| Conta veículos | `fal-pecas/src/pages/Account/AccountVehiclesPage.tsx` |
| Home | `fal-pecas/src/components/home/HomeVehiclesPanel.tsx` |
| HomeGarageSection | `…/HomeGarageSection.tsx` — **existe, não montado** (não remountar; Home já tem panel) |
| Placa / garagem | `VehiclePlateSearch`, `GarageAskPrompt`, `PendingGarageFlush`, `SavedVehiclesQuickPick`, `VehicleSelector` |
| Serviços | `customerVehicleService.ts`, `pendingGarage.ts`, `flushPendingGarage.ts`, `authReturnPath.ts`, `plateLookupService.ts`, `vehicleService.ts` |
| Catálogo | `CatalogPage.tsx`, `searchService.ts` |
| Auth shell | `AccountLayout.tsx`, `router.tsx` (`/conta/veiculos`), `MobileNav.tsx` |

### 2.2 Backend / schema

| Artefato | Estado |
|----------|--------|
| `customer_vehicles` | FKs nullable; `is_primary`; textos `maker_text`…`plate` |
| `upsert_vehicle_canonical` | Edge + admin import |
| `product_vehicle_compatibility` | Filtro catálogo / PDP apps |
| `cart_items` / `order_items` | **Sem** `customer_vehicle_id` |
| Storage | Bucket `product-images` (staff) — **sem** bucket cliente/garagem |

### 2.3 Tipos

`CustomerSavedVehicle` — `versionId` nullable, `nickname`, `plate`, nomes derivados. **Sem** cor, notes, assets.

---

## 3. Mapeamento dos fluxos atuais

```mermaid
flowchart TD
  placa[Placa UI] --> edge[Edge plate-lookup]
  edge --> upsert[upsert mestre source=plate]
  edge --> confirm[Confirmação]
  confirm --> catalog[Catálogo filtros URL]
  confirm --> ask[GarageAskPrompt]
  ask -->|anon| pending[sessionStorage pending]
  pending --> login[Login + returnTo]
  login --> flush[PendingGarageFlush]
  flush --> cv[customer_vehicles insert]
  ask -->|auth| cv
  conta[AccountVehiclesPage form] --> cv
  cv --> list[Lista conta / Home / QuickPick]
  list --> catalog
  catalog --> pvc[PVC search_products]
```

**Gaps de fluxo:** sem página do veículo; sem contexto ativo global; sem update; sem fotos; cart/checkout ignoram garagem.

---

## 4. Problemas identificados

| ID | Problema | Impacto | Origem |
|----|----------|---------|--------|
| P1-01 | Sem `updateSavedVehicle` | Não dá para completar incompleto sem novo insert | Residual R1 |
| P1-02 | Sem dedup por placa | Duplicatas ao re-salvar | Residual R7 |
| P1-03 | Placa não exibida na UI da conta | UX/rastreio fraco | `AccountVehiclesPage` |
| P1-04 | Sem veículo ativo app-wide | Contexto só via URL/`is_primary` visual | Arquitetura |
| P1-05 | Sem página `/conta/veiculos/:id` | Não há “espaço do carro” | UX |
| P1-06 | Sem cor/foto/Storage cliente | Personalização impossível | Schema |
| P1-07 | Sem 3 estados de compatibilidade | Risco de percepção falsa | Catálogo/PDP |
| P1-08 | Cart/order sem veículo | Histórico e compra inteligente bloqueados | Commerce |
| P1-09 | Compra ≠ instalação não modelados | Histórico confuso no futuro | Domínio |
| P1-10 | `HomeGarageSection` órfão | Risco de UI duplicada se montado | Home |
| P1-11 | Edge pode criar VV “aberta” | Qualidade do mestre | Residual R2 (paralelo) |
| P1-12 | Auditoria v1 desatualizada | Decisão errada se lida isolada | Docs |

---

## 5. Arquitetura proposta

### 5.1 Três dimensões (obrigatório)

1. **Identidade pessoal** — veículo do cliente (`customer_vehicles` + assets + personalização).
2. **Identidade canônica** — mestre FAL (FKs opcionais; sem inventar VV na garagem).
3. **Compatibilidade técnica** — evidência PVC + regras; ausência de evidência ≠ confirmada.

### 5.2 Diagrama

```mermaid
flowchart TB
  subgraph pessoal [Identidade pessoal]
    CV[customer_vehicles]
    assets[customer_vehicle_assets]
    notes[nickname color notes]
  end
  subgraph canonico [Identidade canônica]
    M[manufacturers models VV]
  end
  subgraph tech [Compatibilidade]
    PVC[product_vehicle_compatibility]
  end
  subgraph contexto [Contexto ativo]
    GC[GarageContext session]
    URL[catalog URL filters]
  end
  subgraph commerce [Comércio]
    cart[cart_items + vehicle snapshot]
    oi[order_items + vehicle snapshot]
    hist[customer_vehicle_part_events]
  end
  placa[plate-lookup] --> M
  placa --> CV
  CV -.->|FKs opcionais| M
  GC --> URL
  URL --> PVC
  GC --> cart
  cart --> oi
  oi --> hist
  CV --> assets
```

### 5.3 Decisões travadas

| Tema | Decisão |
|------|----------|
| Rotas | Dashboard `/conta/veiculos`; detalhe `/conta/veiculos/:id` sob `AccountLayout` |
| Veículo ativo | `GarageContext` + `sessionStorage` `fal_active_garage_vehicle` (`customerVehicleId` + filtro derivado). **Independente** de `is_primary`. Troca **não** muta cadastro |
| Sync catálogo | Aplicar ativo → query string já existente (`maker/model/year/engine/version`) |
| Visitante | Só URL + pending (como hoje); sem Context persistente de id |
| Mínimo save | `maker_text` + `model_text`; motor/versão/placa/cor/foto opcionais |
| Home | Manter `HomeVehiclesPanel`; **não** montar `HomeGarageSection` em paralelo |
| Imagens stock | Só se confiança ≥ limiar; senão placeholder neutro — nunca outro modelo/geração |
| Fotos pessoais | Bucket privado + RLS dono; signed URLs |
| Compat confirmada | Exige evidência PVC adequada (ver §7.2) |
| Compra | Direta se confirmada; aviso + confirmação se provável; sem bloqueio amplo inventado |
| Instalação | Declaração do cliente (`installed_declared`); ≠ compra |
| Branch | Só `dev` até autorização explícita de produção |

### 5.4 Preparação para evolução (sem implementar P2)

- Identidade pessoal ≠ assets ≠ canônico ≠ contexto de sessão.
- `customer_vehicle_part_events` extensível a proveniência oficina depois.
- Sem tabelas de 3D/oficina/km nesta fase.

---

## 6. Modelo de dados e relacionamentos

### 6.1 Alterações em `customer_vehicles`

| Coluna | Tipo | Notas |
|--------|------|-------|
| (existentes) | FKs + textos + plate + nickname + is_primary | Manter |
| `color_hex` | text null | Personalização visual |
| `color_label` | text null | Ex.: “Prata” |
| `notes` | text null | Observações pessoais |
| `primary_asset_id` | uuid null FK assets | Imagem principal pessoal |
| `source_snapshot` | jsonb null | Residual R3 — originais API (opcional nesta fase ou G1.5) |

**Constraints:** unique parcial `(customer_id, plate)` onde `plate IS NOT NULL` (R7).  
**API:** `updateSavedVehicle` (R1) — update no mesmo `id`.

### 6.2 Novas tabelas (mínimo justificado)

**`customer_vehicle_assets`**

- `id`, `customer_vehicle_id`, `customer_id` (denormalizado para RLS), `storage_path`, `sort_order`, `is_primary`, `created_at`
- RLS: dono via `customer_id = current_customer_id()`

**`vehicle_stock_images`** (curadoria admin)

- `id`, `maker`, `model`, `year_from`, `year_to`, `image_url`/`storage_path`, `confidence` (0–1), `active`
- Só servir se `confidence >= threshold` (ex. 0.8) e match maker/model/(ano)

**`customer_vehicle_part_events`**

- `id`, `customer_id`, `customer_vehicle_id` null, `order_id` null, `order_item_id` null, `product_id` null
- `event_type`: `bought` | `associated` | `awaiting_install` | `installed_declared` | `returned`
- `provenance`: `customer` | `system` (oficina = P2)
- `payload` jsonb, `created_at`

### 6.3 Commerce

| Tabela | Colunas |
|--------|---------|
| `cart_items` | `customer_vehicle_id` uuid null, `vehicle_snapshot` jsonb null |
| `order_items` | idem (snapshot imutável no pedido) |

Snapshot sugerido: `{ maker, model, year, engine, version, plate, customerVehicleId, versionId }`.

### 6.4 Storage

- Bucket privado `customer-vehicle-images`
- Path: `{customer_id}/{vehicle_id}/{asset_id}`
- Policies: upload/read/delete só do dono; staff read opcional

### 6.5 O que não criar agora

`mileage_log`, oficinas, mecânicos, documentos avançados, entidades 3D, compartilhamento.

---

## 7. Regras de negócio

### 7.1 Cadastro

1. Placa = porta principal; manual assistido sempre disponível.
2. Reaproveitar dados confiáveis da API; não pedir de novo o que já veio.
3. Salvar com maker+model; motor/versão opcionais; sem VV fictícia.
4. IDs da placa reutilizados se confirmação consistente.
5. Originais vs normalizados preservados (textos + raw; snapshot jsonb quando R3).
6. Dedup: mesma placa do mesmo cliente → update/merge, não novo insert cego.
7. Pessoal ≠ canônico ≠ PVC.

### 7.2 Compatibilidade (3 estados)

| Estado | Critério técnico |
|--------|------------------|
| **Confirmada** | Veículo com identificação suficiente para casar PVC de forma inequívoca (preferência: `version_id` + PVC na VV/ano) |
| **Provável** | Interseção PVC com filtro parcial (maker+model±ano) **ou** falta motor/versão no veículo pessoal |
| **Não confirmada** | Sem interseção PVC / sem evidência |

- Ausência de “incompatível conhecido” **não** é confirmada.
- Proibido: similaridade textual de nome como prova única.
- Copy alinhada à já usada: “compatibilidade limitada” quando incompleto.

### 7.3 Compra inteligente

| Estado | Comportamento P1 |
|--------|------------------|
| Confirmada | CTA comprar normal |
| Provável | Aviso + confirmação explícita do cliente |
| Não confirmada | Não rotular como compatível; permitir browse; bloqueio amplo **não** inventado nesta fase |

### 7.4 Histórico

- Compra ≠ associação ≠ instalação.
- Sugestão de veículo pelo contexto ativo; cliente corrige ou deixa sem associação.
- `installed_declared` = declaração; provenance `customer`.

### 7.5 Contexto ativo vs principal

- `is_primary` = preferência permanente de cadastro.
- Ativo = sessão/navegação; pode diferir do principal.
- Trocar ativo não altera `is_primary` nem FKs.

### 7.6 Personalização

- Nickname, cor, fotos, notes — **não** alteram dados técnicos oficiais / FKs canônicas.

---

## 8. Fluxos completos de usuário

### A — Placa → garagem (auth)

1. Informa placa → Edge → confirmação.  
2. Confere/completa só ausentes → catálogo + ask.  
3. Sim, salvar → `customer_vehicles` (ou pending→login→flush).  
4. Aparece no dashboard; opcional abrir detalhe.

### B — Placa → visitante

1. Igual até ask → pending + login/cadastro → flush + returnTo.

### C — Manual assistido

1. Falha/incompleto da API ou “selecionar manualmente”.  
2. Preenche só faltantes (árvore + textos).  
3. Save progressivo maker+model.

### D — Completar incompleto

1. Abre detalhe → editar → `updateSavedVehicle`.  
2. Pode vincular `version_id` se resolver; senão permanece null.

### E — Navegar com veículo ativo

1. Seleciona ativo (dashboard, quick pick, header).  
2. Catálogo/PDP usam filtro + badges.  
3. Add to cart carrega snapshot se ativo existir.

### F — Histórico básico

1. Pedido pago → eventos `bought` (+ `associated` se snapshot).  
2. Cliente marca `awaiting_install` / `installed_declared` ou desassocia.

---

## 9. Especificação UX/UI

### 9.1 Princípios

- Parecer nativo FAL (tokens `fal-*`, `rounded-fal`, `Button`/`Card`/`EmptyState`).
- Consumidor final — não tabela administrativa.
- Hierarquia: 1 ação primária por seção; secundárias outline/light.
- Reutilizar `MobileDrawer`, padrões Account sidebar + tabs mobile.

### 9.2 Telas

#### T1 — Dashboard `/conta/veiculos`

- **Hierarquia:** título “Minha Garagem” → veículo principal em destaque → grid de cards → CTA “Adicionar veículo”.
- **Principal:** imagem (stock/pessoal/placeholder), apelido/nome, chips técnicos, badge incompleto se `!versionId`, ações: Usar na loja / Abrir / Editar.
- **Cards:** compactos; indicador “ativo” se context id bater.
- **Vazio:** EmptyState + CTA placa / manual.
- **Loading / erro:** `Loading` / `ErrorState`.

#### T2 — Cadastro por placa

- Reusar `VehiclePlateSearch` (compact no hub “Adicionar”).
- Não reinventar Edge.

#### T3 — Manual assistido

- Evoluir form atual: só campos ausentes; labels “opcional” em motor/versão.
- Mensagem do que ainda falta para compatibilidade plena.

#### T4 — Confirmação placa

- Manter 5 selects + combustível informativo.
- Não inventar “Não informado” como dado real — manter semântica atual.

#### T5 — Página individual `/conta/veiculos/:id`

**Desktop:** coluna imagem (sticky leve) | coluna info + accordion.  
**Mobile:** imagem topo → info → seções verticais; sem scroll horizontal.

Seções expansíveis:

1. Identificação (placa, apelido, principal, ativo)  
2. Características técnicas (maker/model/ano/motor/versão + estado vínculo canônico)  
3. Produtos para este veículo (atalho catálogo + preview)  
4. Fotos e personalização  
5. Histórico básico  

#### T6 — Edição / personalização

- Form: nickname, cor, notes, completar técnicos, set primary.
- Galeria: upload, set capa, excluir.
- Técnico vs visual claramente separados na UI.

#### T7 — Seletor de veículo ativo

- Entrada no Header (desktop) e/ou chip no catálogo + MobileDrawer.
- Lista curta da garagem + “Nenhum / limpar contexto”.
- Visitante: só filtros manuais/placa.

#### T8 — Busca contextualizada

- Chips do filtro ativo; aviso se dados insuficientes.
- Empty PVC existente permanece.

#### T9 — Resultados / badges compatibilidade

- Badge nos cards e PDP: Confirmada | Provável | Não confirmada (+ tooltip com critério curto).

#### T10 — Associação peça/compra

- No pós-compra / detalhe pedido: “Este item é do seu Onix?” → sim / outro / nenhum.
- Na página do veículo: lista eventos com ações marcar instalado / desassociar.

### 9.3 Componentes reutilizáveis

| Existente | Novo (planejado) |
|-----------|------------------|
| Button, Card, EmptyState, Loading, Select, Input, Badge, MobileDrawer | `GarageDashboard`, `GarageVehicleHero`, `GarageVehicleCard`, `GarageVehicleDetail`, `GarageActiveSwitcher`, `CompatibilityStateBadge`, `VehicleImageResolver`, `VehiclePhotoGallery`, `GarageContext` provider |

---

## 10. Especificação responsiva

| Breakpoint | Comportamento |
|------------|---------------|
| Mobile (< lg) | Stack; Accordion; bottom nav “Meus carros” → dashboard; seletor ativo em drawer |
| Tablet | Cards 2 col; detalhe ainda stack ou split suave |
| Desktop (lg+) | Dashboard destaque + grid; detalhe split imagem\|dados; Account sidebar |

Regras: touch targets ≥ 44px; sem overflow-x; imagens `object-cover` com aspect estável; sticky CTAs só se não cobrirem conteúdo crítico.

---

## 11. Componentes e integrações

### 11.1 Integrações internas

| Sistema | Uso |
|---------|-----|
| Edge plate-lookup | Cadastro A |
| `search_products` / PVC | Catálogo + badges |
| CartContext / place_order | Snapshot veículo |
| Auth / `current_customer_id` | RLS e flush |
| AccountLayout / router | Rotas G2 |
| Image CDN Netlify (futuro) | Otimizar URLs stock/pessoais **depois** do Storage estável |

### 11.2 Não integrar agora

Mercado Pago/ME além do checkout já existente; APIs de oficina; geradores 3D; LLM para inventar motor/versão.

---

## 12. Estratégia de segurança e RLS

| Recurso | Política |
|---------|----------|
| `customer_vehicles` | Manter `cvehicles_all_own` |
| `customer_vehicle_assets` | CRUD se `customer_id = current_customer_id()` |
| `customer_vehicle_part_events` | idem |
| `vehicle_stock_images` | read authenticated/anon; write staff |
| Storage | privado; path prefix = customer_id; signed URL curta |
| Placas | nunca em URL pública de CDN sem auth; não expor em HTML público |
| Isolamento | testes RLS dois clientes |

Validar grants `authenticated` em insert/update/delete (já existem para `customer_vehicles`).

---

## 13. Estratégia de migrações

1. Migrations **somente em `dev`**, aplicadas no projeto FAL `wtbpwuiayednvlhvuhbh` com processo acordado (cuidado: histórico `db push` ainda divergente — residual R6; sem `repair` improvisado).
2. Ordem sugerida: colunas `customer_vehicles` → unique placa → assets → stock_images → cart/order columns → part_events → Storage policies.
3. Backfill: nenhum obrigatório; linhas antigas sem `version_id` já válidas.
4. RPCs `place_order` / sync cart: atualizar na mesma etapa G6 (inspecionar assinatura atual na implementação — **pendência registrada**).

---

## 14. Plano de testes

| # | Caso | Camadas |
|---|------|---------|
| 1 | Placa completa | unit + e2e |
| 2 | Placa sem versão | unit + e2e |
| 3 | Placa sem motor | unit |
| 4 | API parcial | unit + e2e |
| 5 | API down → manual | e2e |
| 6 | Cadastro manual | e2e |
| 7 | Save progressivo | unit + e2e |
| 8 | Sem vínculo canônico | integração |
| 9 | Vários veículos | e2e |
| 10 | Troca veículo ativo | e2e |
| 11 | Recuperação pós-login | e2e (já smokado flush) |
| 12 | Edição / personalização | e2e |
| 13 | Upload/exclusão fotos | integração + RLS |
| 14 | Sem imagem stock | unit UI |
| 15 | Busca contextual | e2e |
| 16 | Compat confirmada / não | unit + e2e |
| 17 | Compra com associação | integração |
| 18 | Compra sem associação | integração |
| 19 | Devolução → evento returned | integração |
| 20 | Isolamento clientes | RLS |
| 21 | Legado `version_id` null | regressão |
| 22 | Dedup mesma placa | unit |
| 23 | Update não duplica | unit |

Harness: Vitest existente; e2e manual/VAL até Playwright estável.

---

## 15. Etapas de implementação (futuras)

Ordem: **integridade → UX garagem → contexto → comércio → histórico → VAL**.

### G0 — Aprovação

- **Objetivo:** eFe aprova este PLANO 1.  
- **Arquivos:** este doc.  
- **Aceite:** autorização explícita para codar na `dev`.

### G1 — Integridade (R1 + R7 + UI placa)

- **Objetivo:** `updateSavedVehicle`; dedup por placa; exibir/editar placa e nickname.  
- **Arquivos:** `customerVehicleService.ts`, `AccountVehiclesPage.tsx`, migration unique parcial, testes.  
- **Depende:** G0.  
- **Testes:** #7, #12, #22, #23.  
- **Riscos:** merge de duplicatas existentes — dry-run SQL antes.

### G2 — Dashboard + detalhe

- **Objetivo:** redesign dashboard; rota `/conta/veiculos/:id`; seções base.  
- **Arquivos:** novas pages/components, `router.tsx`, `AccountLayout` labels.  
- **Depende:** G1.  
- **Testes:** #9, responsivo visual.  
- **Riscos:** regressão links MobileNav.

### G3 — Personalização visual

- **Objetivo:** cor, notes, Storage assets, resolver stock image.  
- **Arquivos:** migrations assets/stock, services upload, UI galeria.  
- **Depende:** G2.  
- **Testes:** #13, #14, RLS storage.  
- **Riscos:** custos storage; imagens erradas — threshold confiança.

### G4 — Veículo ativo

- **Objetivo:** `GarageContext` + seletor + sync catálogo.  
- **Arquivos:** context provider em AppChrome, Header/Catalog chips, QuickPick.  
- **Depende:** G2.  
- **Testes:** #10, #15.  
- **Riscos:** conflito com `is_primary`; sessão vs multi-aba.

### G5 — Compatibilidade 3 estados

- **Objetivo:** serviço de classificação + badges PDP/card/catálogo.  
- **Arquivos:** novo `compatibilityState.ts`, `ProductCard`, `ProductPage`, Catalog.  
- **Depende:** G4.  
- **Testes:** #16.  
- **Riscos:** falso positivo — critérios conservadores.

### G6 — Commerce snapshot

- **Objetivo:** colunas cart/order + preencher no add-to-cart/place_order; avisos compra.  
- **Arquivos:** migrations, `CartContext`, checkout/RPC, UI aviso.  
- **Depende:** G4–G5.  
- **Testes:** #17, #18; regressão checkout.  
- **Riscos:** RPC `place_order` — **pendência:** inspecionar assinatura na hora.

### G7 — Histórico básico

- **Objetivo:** `customer_vehicle_part_events` + UI associação/instalação declarada.  
- **Arquivos:** migration, service, seção Histórico, Account order detail hooks.  
- **Depende:** G6.  
- **Testes:** #17–#19.  
- **Riscos:** não inferir instalação automaticamente.

### G8 — VAL + suite

- **Objetivo:** VAL garagem + fechar matriz §14.  
- **Arquivos:** `fal-pecas/docs/VAL-garagem-*.md`, testes.  
- **Depende:** G1–G7.  
- **Aceite:** critérios §16.

---

## 16. Dependências entre etapas

```mermaid
flowchart LR
  G0 --> G1 --> G2
  G2 --> G3
  G2 --> G4 --> G5
  G4 --> G6
  G5 --> G6
  G6 --> G7 --> G8
```

- G3 e G4 podem paralelizar após G2.  
- G5 precisa de ativo (G4) para badges contextuais.  
- Residuals R2 (Edge VV) e R6 (migration history) são **paralelos ops**, não bloqueiam G2.

---

## 17. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Duplicatas históricas de placa | Script de consolidação antes do unique; UI merge |
| Falso “compatível” | Critérios §7.2; default não confirmada |
| Snapshot quebra place_order | Feature flag / coluna nullable; teste checkout G6 |
| Storage abusado | Limite tamanho/qtde por veículo; mime allowlist |
| Stock image errada | Threshold + curadoria admin; fallback neutro |
| Contexto ativo confunde principal | Copy explícita; ícones distintos |
| Remount HomeGarageSection | Proibido; um hub só |
| Escopo P2 vazar | Checklist “fora” em code review |
| db push divergente | R6 — aplicar migrations com processo eFe |

---

## 18. Critérios de aceite (fase PLANO 1 implementada)

1. Cadastro por placa e manual progressivo (maker+model; sem exigir motor/versão).  
2. Incompletos listados, editáveis (`update`), `version_id` null preservado.  
3. Dashboard + página individual responsivos no DS FAL.  
4. Contexto ativo trocável sem mutar cadastro / `is_primary`.  
5. Compatibilidade nunca rotulada “confirmada” sem evidência PVC.  
6. Compra pode associar ou não; instalação declarada ≠ compra.  
7. Fotos com RLS; stock só com confiança.  
8. Sem regressão busca/checkout/placa.  
9. Implementação só em `dev` até autorização.  
10. Sem 3D/oficinas/manutenção avançada.

---

## 19. Separação final

| Já existe — reaproveitar | Corrigir | Desenvolver (PLANO 1) | Futuro (P2) |
|--------------------------|---------|----------------------|-------------|
| plate-lookup + upsert mestre | R1 update | Dashboard + detalhe | 3D / configurador |
| Save/list progressivo | R7 dedup | GarageContext ativo | Oficinas / mecânicos |
| Pending/flush/ask | Exibir placa na UI | Cor, notes, assets, stock | Documentos avançados |
| Account/Home/QuickPick seed | Docs auditoria v1 | Badges 3 estados | Manutenção preditiva |
| PVC + empty catalog | — | Cart/order snapshot | Compartilhamento histórico |
| DS FAL + AccountLayout | — | Part events histórico | km / lembretes avançados |
| RLS cvehicles | — | VAL garagem | — |

---

## 20. Arquivos que provavelmente serão modificados (implementação futura)

### Frontend

- `fal-pecas/src/pages/Account/AccountVehiclesPage.tsx` → dashboard  
- **Novo:** `AccountVehicleDetailPage.tsx` (ou equivalente)  
- `fal-pecas/src/app/router.tsx`  
- `fal-pecas/src/components/account/AccountLayout.tsx`  
- `fal-pecas/src/services/customers/customerVehicleService.ts`  
- `fal-pecas/src/types/index.ts`  
- `fal-pecas/src/contexts/CartContext.tsx`  
- `fal-pecas/src/components/product/ProductCard.tsx`, `ProductPage.tsx`  
- `fal-pecas/src/pages/Catalog/CatalogPage.tsx`  
- `fal-pecas/src/components/layout/Header.tsx` / `MobileNav.tsx`  
- `fal-pecas/src/components/vehicle/*` (QuickPick, PlateSearch — extensão)  
- **Novos:** `GarageContext`, badges, gallery, dashboard components  

### Backend

- Migrations: colunas CV, assets, stock_images, cart/order, part_events, storage  
- Possível ajuste RPC `place_order` / sync cart  
- Policies Storage  

### Docs / testes

- `fal-pecas/docs/VAL-garagem-*.md`  
- Specs Vitest §14  
- Atualizar links em PLANO 0 / residuals apontando implementação G*

---

## 21. Pendências (informação indisponível — não inventar)

1. Catálogo completo maker/model/geração → imagem stock (curadoria de conteúdo).  
2. Assinatura exata e side-effects de `place_order` / sync de `cart_items` no momento de G6.  
3. Threshold final de `confidence` para stock (proposta inicial 0.8 — validar com eFe).  
4. Política de retenção/LGPD para fotos e placas (prazo e exclusão de conta).  
5. Alinhamento migration history Supabase (R6) antes de `db push` em massa.

---

## 22. Instrução de implementação (quando autorizado)

1. Trabalhar **somente** em `dev`.  
2. Seguir G0→G8; TDD onde houver harness.  
3. Não montar `HomeGarageSection` em paralelo ao `HomeVehiclesPanel`.  
4. Não criar VV fictícia; não afirmar compatibilidade sem PVC.  
5. Não implementar itens da coluna “Futuro (P2)”.  
6. `main` / produção só com autorização expressa do eFe.

---

**Status:** PLANO 1 documentado para revisão e aprovação eFe — **sem código nesta entrega**.  
**Próximo passo:** aprovação → G1 (update + dedup) na `dev`.
