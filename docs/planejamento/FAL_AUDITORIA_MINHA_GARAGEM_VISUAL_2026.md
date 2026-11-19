# FAL — Auditoria completa: Minha Garagem + Módulo Visual

**Status:** RELATÓRIO READ-ONLY  
**Data:** 2026-11-18  
**Branch lida:** `dev`  
**Escopo:** diagnóstico documental — sem implementação nesta entrega  
**Produto:** FAL Peças Automotivas (`fal-pecas`)  
**Projeto Supabase (contexto):** `wtbpwuiayednvlhvuhbh`

**Brief das 21 seções:** mensagem eFe no chat (2026-11-18, “AUDITORIA COMPLETA DA MINHA GARAGEM + MÓDULO VISUAL”, §13). **Não há arquivo canônico desse brief no repositório**; a estrutura abaixo reproduz fielmente os títulos daquela mensagem.

**Input de layout (eFe):** mockup bento / hero 3D / mobile (asset de sessão Cursor). Cores a preservar: identidade FAL (`--fal-navy`, `--fal-yellow`, `--fal-accent`, `--fal-success` em `fal-pecas/src/styles/index.css`) — não o purple do mockup. O mockup **não** fecha sozinho a arquitetura; ver §18 e §20.

---

## 1. Resumo executivo

A Minha Garagem hoje é uma **área da Conta** (`AccountLayout` + `/conta/veiculos`), não um produto “garagem-first” como o mockup. O núcleo 2A (identity, timeline, manutenções, profissionais, evidências, shares, transferência, inteligência) está **exposto na UI** via 9 abas horizontais. O Visual (2B/Consolida) tem **engine + GLB + XR gated + CarImages 2D** no código e na ficha; a experiência ainda é técnica (jargão, canvas abaixo da dobra, asset placeholder vs foto).

**Não existe** shell cliente A1/A2/A3 (`GarageWorkspace.tsx`); `AdaptiveWorkspace` é **só admin**. Tripo API e Pan Raven/360° **não localizados** nos termos pesquisados. Runtime nesta sessão: lista `/conta/veiculos` autenticada (Fernando, Palio + Classic + HB20 + Q3); detalhe/`?modulo=visual` **não reobservado** aqui (redirect login) — complementar com UX audit Consolida 2026-11-18.

**Intenção de produto registrada:** eFe quer **esse layout** (mockup) com cores FAL. Esta auditoria **não implementa**; lista gaps e decisões.

---

## 2. Escopo e metodologia

### Escopo

- Minha Garagem (lista + ficha + módulos)
- Módulo Visual / Visualization Engine / GLB / XR / CarImages
- Conformidade vs Plano 2A / 2B / Consolida 3D
- Referências externas e direção visual recomendada

### Fora de escopo desta entrega

Código, migrations, commits, deploy, `main`, redesign UI.

### Quatro níveis de evidência

| Nível | Significado |
|-------|-------------|
| **Código presente** | Implementação no repo (path + símbolo) |
| **Exposta na interface** | Rota / componente / fluxo na UI |
| **Runtime verificado** | Observado no navegador nesta sessão (ou sessão citada com data) |
| **Não verificado** | Não confirmado em execução aqui |

### Regras

- Auditorias anteriores = pistas; fatos reconferidos no código em 2026-11-18.
- Ausência de match nos termos ≠ prova ontológica de “nunca existiu”; classificar **não localizado**.
- Segurança: citar policy + impacto **potencial**, sem inflar CVE.

### Fontes técnicas reconferidas

- `fal-pecas/src/app/router.tsx`
- `fal-pecas/src/pages/Account/AccountVehiclesPage.tsx`, `AccountVehicleDetailPage.tsx`, `AccountLayout.tsx`
- `fal-pecas/src/components/garage/*`, `fal-pecas/src/services/garage/*`
- Migrations `20261118150000`, `20261118180000`…`20261118240000`
- Docs: `FAL_PLANO2A_VEHICLE_IDENTITY_2026.md`, `FAL_CONSOLIDA_3D_UX_AUDIT_2026-11-18.md`

---

## 3. Inventário de páginas e rotas

| Rota | Página / símbolo | Evidência |
|------|------------------|-----------|
| `/conta/veiculos` | `AccountVehiclesPage` | Código + **runtime verificado** (lista autenticada, 2026-11-18) |
| `/conta/veiculos/:id` | `AccountVehicleDetailPage` | Código + URL vista no click; conteúdo detalhe **não verificado** nesta sessão (sessão caiu) |
| `/conta/veiculos/:id?modulo=<key>` | query `modulo` via `parseGarageModule` (`garageWorkspacePrefs.ts`) | Código + UI exposta; runtime detalhe **não verificado** nesta sessão |
| `/conta/veiculos/:id?edit=1` | modo edição | Código presente |
| `/admin/modelos-3d` | `AdminVisualAssetsPage` | Código + nav `adminNavConfig` (CATALOG_OPS) |
| `/login` | redirect se não autenticado | **Runtime verificado** ao navegar para visual |

**Não é rota:** `?modo=vida|meu` na timeline; `modo=filtros` **não implementado** no TS (`TimelineMode = 'vida' \| 'meu'`).

---

## 4. Inventário de componentes

### Conta / shell

| Componente | Path | Papel |
|------------|------|-------|
| `AccountLayout` | `src/pages/Account/AccountLayout.tsx` | Sidebar conta (Início, Perfil, Endereços, **Minha Garagem**, Favoritos, Pedidos, Avisos) |
| `MainLayout` + `StoreThemeToggle` | tema loja | Classe `dark` + `fal-store-theme` |
| `MobileNav` | `src/components/.../MobileNav.tsx` | Início, Catálogo, Carrinho, Conta, **Garagem** → `/conta/veiculos` |

### Garagem (`src/components/garage/` — 21 `.tsx`)

Inclui: `GarageVehicleHero`, `GarageVehicleCard`, `GarageActiveSwitcher`, `IncomingTransferBanner`, `VehicleIdentityTimeline`, `VehicleMaintenancesPanel`, `VehicleProfessionalsPanel`, `VehicleEvidencePanel`, `VehicleSharesPanel`, `VehicleIntelligencePanel`, `VehicleTransferPanel`, `VehiclePhotoGallery`, `VehicleVisualPanel`, `VehicleVisualizationEngine`, `VehicleGlbViewer`, `VehicleViewer3D`, `VehicleSilhouette2D`, `VehicleXrLauncher`, `VehicleImageFrame`, `VehiclePartHistory`, `OrderPostPurchaseGarageActions`.

### Admin Visual

`AdminVisualAssetsPage`, `adminVisualAssetService` — draft/approve GLB, `source` incl. `ai`.

### Workspace admin (não cliente)

`AdaptiveWorkspace` — só `AdminDashboardPage` / `AdminOrdersHubPage`.

---

## 5. Diagnóstico da Minha Garagem

| Aspecto | Estado | Evidência |
|---------|--------|-----------|
| Lista de veículos | **Código + UI + runtime** | Hero Palio principal (CarImages + disclaimer), Classic/HB20/Q3, CTA “Adicionar veículo” |
| Add placa \| manual | **Código + UI** | `AddTab`, `VehiclePlateSearch intent="garage"`, form manual |
| Veículo ativo loja | **Código + UI + runtime** | Chip Limpar/Trocar no header |
| Ficha por módulos | **Código + UI** | 9 tabs; runtime ficha **não verificado** nesta sessão |
| Copy lista | “filtrar o catálogo e acompanhar o histórico” | Mais “conta/catálogo” do que “garagem-produto” do mockup |

**Gap vs mockup:** sem dashboard bento, sem sidebar de módulos da garagem, sem widgets (próximos cuidados / resumo / preview 3D / FAL IA) na home.

---

## 6. Diagnóstico do workspace

| Planejado (2A §13) | Atual | Classificação |
|--------------------|-------|---------------|
| `GarageWorkspace.tsx` A1/A2/A3 | **Não localizado** (`GarageWorkspace.tsx` 0) | Divergente / ausente no cliente |
| Espelhar comportamento `AdaptiveWorkspace` | Adaptive só admin | Código admin presente; cliente ausente |
| `?modulo=` + prefs `fal-garage-workspace-v1` | Preferência `lastModule` only | Parcial |
| `?modo=vida\|meu\|filtros` + `?evento=` | Só vida/meu; sem `evento` | Parcial |
| Hero ~300px + abas | `lg:grid-cols-[300px_1fr]` + nav horizontal | Parcial vs A1+A2; **sem A3** |

Doc 2A marca E1–E5 **IMPLEMENTADO** na `dev` com VAL; shell 3 áreas permanece **gap de experiência**.

---

## 7. Diagnóstico desktop

**Runtime lista (autenticado):** layout conta — aside 240px + conteúdo; hero 2 colunas (`GarageVehicleHero` `lg:grid-cols-[minmax(0,240px)_1fr]`); cards “Outros veículos” sem thumbnail grid rico.

**Código ficha:** abas `MODULE_TABS` em linha; Visual é uma aba entre nove — compete com Histórico/Manutenções/etc.

**vs mockup desktop:** mockup tem shell garagem dedicada, header com seletor+busca na garagem, bento de widgets, stage 3D dominante no detalhe. Atual = conta genérica + lista/ficha.

---

## 8. Diagnóstico mobile

| Item | Evidência |
|------|-----------|
| Nav conta horizontal `lg:hidden` | Código `AccountLayout` |
| Bottom `MobileNav` loja (5 itens) | Código; **≠** bottom nav do mockup (Início/Veículos/+/Notif/Perfil) |
| Abas módulos overflow-x | Consolida UX audit **runtime** 2026-11-18 @390px: scroll lateral 885>362 |
| Visual @390 | Consolida: canvas ~360×280, sem overflow página; alvos toque <44px |
| Esta sessão @390 detalhe/visual | **Não verificado** (login divert) |

**vs mockup mobile:** falta grade de 6 atalhos de módulo, FAB “+” = add veículo no centro, stage carro no detalhe escuro.

---

## 9. Diagnóstico de informações e histórico

| Capacidade | Código | UI | Runtime | Nota |
|------------|--------|-----|---------|------|
| Timeline identity + G7 | `listIdentityTimeline`, `VehicleIdentityTimeline` | `modulo=historico` | Não verificado aqui | G7 via `listVehiclePartEvents(membershipId)`; mapa SQL `customer_vehicle_part_event_identities` não lido no TS |
| Odômetro | `odometerService` | na timeline | Não verificado | |
| Manutenções | `VehicleMaintenancesPanel` | `modulo=manutencoes` | Não verificado | |
| Profissionais | `VehicleProfessionalsPanel` | sim | Não verificado | |
| Evidências upload/lista | `VehicleEvidencePanel` | sim | Não verificado | |
| Link N:N evidência↔evento | `linkEvidenceToEvent` no service | **UI não expõe** link/unlink | — | Parcial |
| Shares | `VehicleSharesPanel` | sim | Não verificado | |
| Transferência | `VehicleTransferPanel` + wizard service | `config` | Não verificado | |
| Inteligência / schedules | `VehicleIntelligencePanel` | sim | Não verificado | |
| `modo=filtros` | — | — | — | **Não localizado** no TS |

### RLS (impacto potencial)

- `ve_select_related` (`vehicle_events`, migration E2): staff **ou** qualquer `vehicle_ownership_periods` do `current_customer_id()` na identity — **sem** exigir período vigente. Impacto potencial: ex-proprietário com período histórico ainda lê eventos da identity (alinhado a “vida do veículo”, mas diverge de AUTHORIZED exhaustivo do plano §22/§24). **Não** é `USING (true)`.
- `cvpe_select_own` (G7): restrito a `customer_id = current_customer_id()` — mais estreito.
- `vee_select_related`: mesmo padrão ownership da identity.

---

## 10. Diagnóstico do módulo Visual

| Item | Nível | Evidência |
|------|-------|-----------|
| Entrada UI | Código + UI | `modulo === 'visual'` → `VehicleVisualPanel` |
| Copy jargão | Código + UI | “Visualization Engine”, “2B”, “G7”, “GLB”, viewer `auto/2d/3d` |
| Pintura com GLB | Código + UX audit | Campos editáveis sem efeito no GLB (P0 UX) |
| Hierarquia | UX audit runtime 2026-11-18 | Canvas abaixo de disclaimers/toggles |
| CarImages 2D | Código + **runtime lista** | Disclaimer “Não é foto do seu carro” no Palio |
| Visual ≠ fato | Código | Copy/disclaimer presentes |

---

## 11. Diagnóstico do Visualization Engine

**Arquivo:** `src/services/garage/visualizationEngine.ts` — `resolveVisualizationSource`, `effectiveRenderSource`.

Ordem: XR (se gates) → 2D (preferência/WebGL/reduced motion) → GLB aprovado → procedural → 2D.

**UI:** `VehicleVisualizationEngine.tsx` (lazy viewers).  
**Runtime engine nesta sessão:** não verificado.  
**Runtime anterior:** Consolida UX — `Engine · resolvido: 3D GLB (asset aprovado)` no Palio local.

---

## 12. Diagnóstico do pipeline GLB/Tripo

| Elemento | Resultado da busca | Classificação |
|----------|-------------------|---------------|
| `VehicleGlbViewer` + `OrbitControls` + `GLTFLoader` | `VehicleGlbViewer.tsx` | Código + UI |
| Admin approve / `assetReadyForPublicViewer` | types + `AdminVisualAssetsPage` | Código + UI admin |
| `source: 'ai'` metadado | CHECK SQL + select admin | Código presente |
| Tripo / tripo3d SDK/API | Termos: `Tripo`, `tripo`, `tripo3d` — único hit = copy ajuda admin | **API Tripo não localizada** |
| Smoke box em `tmp/fal-smoke-palio-box.gltf` | Não referenciado em `src/` | Artefato tmp; UX audit citou cubo cinza em runtime anterior |

---

## 13. Diagnóstico 360° e Pan Raven

**Termos pesquisados:** `panraven`, `pan.?raven`, `Pan Raven`, `equirectangular`, `panorama`, `raven`, `pano`, `equirect`, `360` (este último só hits irrelevantes: TTL cache, CSS `360px`, etc.).

**Resultado:** integração Pan Raven / viewer 360° **não localizada** nestes termos. Classificação: **não localizado** (não “prova absoluta de inexistência sob outro nome”).

---

## 14. Referências visuais com imagens e links

Consulta: **2026-11-18**. Conceitos Behance/portfólio ≠ features reais do produto OEM.

| Ref | Link | Tipo de fonte | O que aproveitar (conceito) | Não copiar |
|-----|------|---------------|------------------------------|------------|
| My Porsche App (oficial) | https://www.porsche.com/usa/my-porsche-app/ | Produto OEM | Veículo como centro; status/gestão multi-car | Branding/roxo; telemática OEM |
| My Porsche Newsroom update | https://newsroom.porsche.com/en/2024/products/porscheextensive-update-my-porsche-app-35106.html | Comunicação oficial | Home com quick actions | Assumir paridade de features |
| My Porsche Web case (TEI) | https://www.tei.design/work/myporsche-web/ | Case de design | Ownership-first, swipe multi-car | Não é app FAL |
| Porsche start concept (Wirkus) | https://www.wirkus.me/projects/porsche-app-start-page-concept | Conceito/portfólio | Stage animado + tiles | Não é produto shipped garantido |
| Three.js OrbitControls | https://threejs.org/docs/#examples/en/controls/OrbitControls | Docs técnicos | Gestos orbit/zoom (já em `VehicleGlbViewer`) | — |
| Mockup FAL (eFe) | asset sessão Cursor (bento/hero/mobile) | Brief visual interno | Layout alvo + widgets + stage | Purple; widgets drag-and-drop v1 |

Imagens do mockup são **ilustrativas / intenção de produto**, **não** capturas da FAL em produção.

---

## 15. Matriz de conformidade 2A/2B

| Tema | Planejado | Código | UI | Runtime | Status |
|------|-----------|--------|-----|---------|--------|
| Identity + FAL-code | 2A E1 | sim | ficha `visao` | lista ok | Parcial/funcional núcleo |
| Timeline vida/meu | 2A E2 | sim | historico | n/d sessão | Parcial (`filtros` ausente) |
| Manutenção / pro | 2A E3 | sim | módulos | n/d | Núcleo presente |
| Evidence N:N | 2A E4 | service sim | UI sem link | n/d | Parcial |
| Shares / transfer | 2A E4 | sim | sim | n/d | Núcleo presente |
| Inteligência | 2A E5 | sim | sim | n/d | Núcleo presente |
| Workspace 3 áreas | 2A §13 | não | abas | — | **Divergente** |
| Engine 2d/glb/proc/xr | 2B/Consolida | sim | visual | Consolida sim / sessão n/d | Funcional com gaps UX |
| Admin modelos-3d | 2B | sim | admin | n/d | Presente |
| Tripo geração | menção docs/copy | API não localizada | — | — | Não localizado |
| 360 / Pan Raven | menção produto | não localizado | — | — | Não localizado |
| CarImages 2D | Consolida | adapter + edge | hero | **sim** lista | Presente (fora engine 3D) |

---

## 16. Inventário de problemas + matriz de rastreabilidade

| ID | Problema | Evidência | Desktop/Mobile | Impacto proprietário | Prioridade | Decisão necessária |
|----|----------|-----------|----------------|----------------------|------------|-------------------|
| G1 | Home ≠ dashboard bento | Código lista vs mockup eFe | Ambos | Garagem parece “conta”, não produto | P0 produto | Autorizar redesign shell (§20) |
| G2 | Sem sidebar módulos garagem; 9 abas overflow | `MODULE_TABS`, UX audit mobile | Ambos | Visual/históricos difíceis de achar | P0 UX | Nav lateral vs chips vs “Mais” |
| G3 | Sem stage 3D dominante | `VehicleVisualPanel` ordem + UX audit | Ambos | 3D “escondido” / técnico | P0 UX | Canvas-first no detalhe/Visual |
| G4 | Jargão Engine/G7/GLB/2B | `VehicleVisualPanel` strings | Ambos | Confusão / desconfiança | P0 copy | Glossário humano obrigatório |
| G5 | Foto CarImages vs 3D placeholder | UX audit Consolida + asset smoke | Ambos | Parece bug | P0 percepção | Política AUTO: 2D até GLB real; badge provisório |
| G6 | Pintura editável sem efeito no GLB | UX audit + código panel | Ambos | Expectativa quebrada | P0 UX | Ocultar/desabilitar no `glb` |
| G7 | Workspace A1/A2/A3 ausente | Sem `GarageWorkspace.tsx` | Desktop | Diverge plano 2A | P1 produto | Manter abas, implementar 3 áreas, ou mockup hybrid |
| G8 | `modo=filtros` / `?evento=` ausentes | `TimelineMode`, timeline | Desktop | Filtros planejados não existem | P2 | Escopo Etapa UX |
| G9 | UI sem link evidência↔evento | service vs `VehicleEvidencePanel` | Ambos | Biblioteca solta do histórico | P2 | Expor N:N ou adiar |
| G10 | RLS events sem período vigente | `ve_select_related` | — | Leitura ampla na identity | P2 segurança/produto | AUTHORIZED / vigente? |
| G11 | Touch targets <44px Visual | UX audit @390 | Mobile | Mis-taps | P1 | min-h-10+ |
| G12 | Bottom nav mockup ≠ MobileNav loja | `MobileNav.tsx` | Mobile | Conflito loja vs garagem | P1 produto | FAB add só na garagem vs nav global |
| G13 | Tripo/360 não localizados | greps §12–13 | — | Expectativa roadmap | P3 / planejamento | Confirmar se ainda no roadmap |
| G14 | Chrome conta+header+footer | `AccountLayout`+`MainLayout` | Mobile | Pouco espaço útil | P1 | Shell dedicado garagem |

Prioridade baseada em **impacto ao proprietário**, não só esforço técnico.

---

## 17. Priorização

1. **P0 percepção/produto:** G1, G2, G3, G4, G5, G6 (layout mockup + honesty visual).  
2. **P1 usabilidade:** G11, G12, G14, G7.  
3. **P2 profundidade 2A:** G8, G9, G10.  
4. **P3 roadmap mídia:** G13.

Quick wins sem redesign completo (se eFe autorizar depois): copy humana, desabilitar pintura no GLB, badge 3D provisório, canvas no topo do módulo Visual, touch targets.

---

## 18. Direção visual recomendada

**Input eFe (2026-11-18):** “vamos ter esse layout” — mockup bento + stage + mobile grid, **cores FAL**.

### Recomendação (não decisão fechada)

1. **Home `/conta/veiculos`:** dashboard bento — hero veículo (foto/3D real), próximos cuidados (inteligência/schedules), histórico recente, preview Visual, resumo contagens, card Inteligência — tokens FAL navy/yellow/accent/success.  
2. **Shell:** sidebar de módulos da Garagem no desktop (ou evolução das 9 abas); não copiar purple.  
3. **Detalhe:** stage dominante (claro/escuro via `fal-store-theme`); tabs compactas; status + chips.  
4. **Mobile:** grade de atalhos; “+” = fluxo add placa/manual já existente; negociar com `MobileNav` da loja (§20).  
5. **3D:** engine real; **nunca** apresentar smoke/procedural box como se fosse o carro do hero CarImages.  
6. **Widgets personalizáveis / FAL IA rich:** direção futura; v1 = layout fixo do bento.

Cursor **não** escolhe arquitetura definitiva sozinho — ver §20.

---

## 19. Dependências e riscos

| Risco | Dependência |
|-------|-------------|
| Redesign grande | Conflito com `AccountLayout` / rotas conta / MobileNav |
| GLB real | Pipeline admin + storage + curadoria (smoke prejudica percepção) |
| CarImages | Flag `VITE_FAL_CARIMAGES`, edge, secrets — só 2D |
| XR | `VITE_FAL_VISUAL_XR`, dispositivo WebXR |
| RLS AUTHORIZED | Product call antes de apertar policies |
| Mockup “IA” / widgets | Conteúdo real de `VehicleIntelligencePanel` vs marketing vazio |

---

## 20. Decisões que precisam ser tomadas pelo responsável pelo produto

1. **Autorizar implementação do layout mockup** (com tokens FAL) como próxima etapa após este relatório?  
2. **Shell:** garagem dedicada vs permanecer sob `AccountLayout`?  
3. **Nav módulos:** sidebar mockup vs agrupar 9 abas vs híbrido A1/A2/A3 do 2A?  
4. **MobileNav loja vs bottom nav do mockup** — coexistência?  
5. **Stage 3D no detalhe** sempre vs só em `modulo=visual`?  
6. **Política AUTO visual:** esconder 3D placeholder até GLB “real”?  
7. **Widgets / FAL IA card** no v1 do bento — dados reais ou placeholder honest?  
8. **Dark mode stage** — usar tema loja existente ou tema só-garagem?  
9. **Prioridade P0 Visual quick wins** antes do redesign completo?  
10. **Tripo / 360** — mantém no roadmap ou arquiva até haver provider?

---

## 21. Conclusão

### Diagnóstico (o que sabemos)

- **Existe e está exposto:** lista/ficha da garagem na conta; add placa/manual; 9 módulos 2A; Visual com engine/GLB/XR gated; CarImages 2D no hero; admin modelos-3D; tema claro/escuro loja.  
- **Parcial:** workspace vs plano 2A; evidência N:N; timeline sem filtros; Visual usável mas técnico; mobile com scroll de abas.  
- **Diverge da experiência desejada (mockup + 2A shell):** não é dashboard bento nem stage-first; chrome de conta; purple do mockup não deve ser usado.  
- **Não localizado:** API Tripo; Pan Raven/360° (termos listados).  
- **Runtime desta sessão:** lista autenticada OK; detalhe/visual **não refechado** aqui.

### Decisões do eFe (antes do planejamento definitivo da reformulação)

As dez perguntas da §20. Sem essas respostas, qualquer implementação de layout seria escolha unilateral do Cursor — fora do rigor acordado.

---

**Fim do relatório.** Sem código, migrations, commits ou deploy nesta entrega. Aguardar avaliação e autorização da próxima etapa.
