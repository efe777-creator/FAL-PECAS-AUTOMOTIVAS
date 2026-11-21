# Estudo + Plano — Aplicações PVC: auditoria e re-layout (TO-BE Adaptive)

**Data:** 2026-11-21 · Branch alvo: **`dev`**  
**Status:** **IMPLEMENTADO** — FAL-UI-LAYOUT **v1.1.0** (Fases 0+1+2) · VAL [FAL_MARCHA_UI_LAYOUT_v110_APLICACOES_VAL_2026-11-21.md](./FAL_MARCHA_UI_LAYOUT_v110_APLICACOES_VAL_2026-11-21.md)  
**Âncora histórica do estudo:** partiu de v1.0.4 · [marcha dinâmica](./FAL_MARCHA_UI_LAYOUT_v104_VAL_2026-11-21.md)  
**Normativo vigente:** [FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1…](./FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1_2026-11-21.md) §5 — módulo `applications` no mapa Adaptive  
**Pontes guia↔guia:** entregues em **v1.1.1** · [VAL](./FAL_MARCHA_UI_LAYOUT_v111_PONTES_GUIA_VAL_2026-11-21.md)  
**Fora desta entrega (backlog):** Fase 3 cascata compartilhada hub↔ficha

---

## 1. Escopo auditado

| Superfície | Path / arquivo | Linhas ~ |
|------------|----------------|----------|
| Hub global Aplicações | `/admin/aplicacoes` → `AdminApplicationsPage.tsx` | ~1009 |
| Seção ficha produto/kit | `AdminProductApplicationsSection.tsx` | ~370 |
| Guia Produto (RO) | `ProductWorkSurface` seção Aplicações | lista + atalho |
| Import | `/admin/produtos/importar-aplicacoes` | fora do re-layout hub |
| Service | `adminApplicationService.ts` + product apps APIs | preservar 100% |

**Domínio intocado:** PVC, anos, coringa motor/versão, Liberar checklist `hasApplication`, import apply.

---

## 2. AS-IS — inventário factual (hub `/admin/aplicacoes`)

### 2.1 Capacidades (PRESERVAR)

| Capacidade | Onde |
|------------|------|
| Listar global paginado | `adminListApplicationsGlobal` |
| Filtros q + montadora→modelo→motor→versão (URL searchParams) | primary |
| Criar (SKU + cascata + anos; bulk configs se “Todas”) | formulário no meio da página |
| Editar período inline | linha tabela |
| Trocar veículo (swap) inline | linha tabela |
| Seleção + excluir lote | barra acima da tabela |
| Excluir unitário | linha |
| Link produto → `/admin/produtos/:id` | coluna Produto |
| Import planilha | CTA → importar-aplicacoes |
| RBAC | só admin/gerente (`canManage`) |
| Carregar mais | paginação |

### 2.2 Anatomia atual

```
[H1 + texto longo + Importar + Nova]
[Form criar — se aberto — ocupa vertical]
[Filtros sempre expandidos — 5 campos]
[Banner seleção / aviso paginação]
[Tabela desktop única — sem cards mobile]
  └─ edição/swap embutidos na linha (densidade alta)
```

### 2.3 Fricções vs padrão zin v1.0.4

| ID | Achado | Contra-padrão |
|----|--------|---------------|
| AP1 | Hub **clássico** (sem AdaptiveWorkspace) | §5 “até MINOR”; lista perde contexto ao “editar” |
| AP2 | Form **Nova** no meio da página | Produtos/Preços: criar/editar na **guia** |
| AP3 | Filtros **sempre abertos** | FL14: compacto + Mais filtros + chips |
| AP4 | Sem **Abrir guia / + Guia / Na guia** | Vocabulário travado Central→Catálogo |
| AP5 | Edição/swap **inline na grade** | Guia = mutação contextual; grade = scan |
| AP6 | Sem cards mobile / compact primary | Densidade §7 + CSS list-mobile |
| AP7 | `<Link><Button>` Importar | FL11 |
| AP8 | Cores `text-red-600` / `amber-50` | Tokens `text-fal-danger` / `fal-warning` |
| AP9 | Texto intro longo no 1º viewport | Hero budget / one job |
| AP10 | Duplicação lógica create/edit com `AdminProductApplicationsSection` | Drift UX PVC (2 UIs) |
| AP11 | Guia Produto só RO apps | Ok híbrido; falta atalho “Abrir no hub” com `?q=` |
| AP12 | Bulk delete na primary; create na primary | Bulk/create → contextual (como Produtos lote) |

---

## 3. Cruzamento jornada

| Jornada | Hoje | TO-BE desejado |
|---------|------|----------------|
| Operador corrige PVC de 1 SKU | Entra hub → busca → edita linha **ou** abre ficha aba | Lista → **Abrir guia** → editar período/veículo; full se multi-add complexo |
| Import massivo | CTA import | Mantém (fora do split) |
| Liberar produto | Seção na ficha | Mantém seção; hub global para auditoria transversal |
| Ver apps a partir da guia Produto | RO + “Gerir no cadastro” | + **Abrir hub** `/admin/aplicacoes?q=SKU` e opcional Abrir guia da app |

---

## 4. Decisão de design (abordagens)

### A — Polish hub clássico (PATCH)

Só FL11, tokens, filtros compactos, mobile cards, sem Adaptive.  
**Prós:** rápido. **Contras:** continua fora do zin; form no meio da página.

### B — Adaptive `applications` MINOR **v1.1** (recomendada)

| Peça | Contrato |
|------|----------|
| `moduleKey` | `'applications'` em `WorkspaceModuleKey` |
| Primary | Lista + filtros compactos + Abrir guia / + Guia |
| Contextual | `ApplicationWorkSurface` |
| Full | Ficha produto aba Aplicações **ou** import |

**Guia (`ApplicationWorkSurface`) — seções Expandir/Recolher:**
1. Resumo (SKU, nome, veículo, período) + link Abrir cadastro produto  
2. Período (anos) — editar + salvar  
3. Veículo (cascata swap) — editar + salvar  
4. Ações: Excluir · Abrir produto (+ Guia no hub Produtos via ponte opcional)

**Nova aplicação:** guia “Criar” (como Kits Novo na guia / Preços formGuide) — **não** no meio da lista.

**Bulk exclusão:** barra na guia quando N selecionados (padrão Produtos lote) **ou** primary compacta + guia lote.

### C — Fundir tudo na ficha produto

Abandonar hub global. **Rejeitada:** perde auditoria transversal (mesmo veículo em N SKUs).

**Recomendação: B** — alinha Catálogo ao zin; bump **MINOR v1.1** do padrão + locks FL16+.

---

## 5. Plano de implantação (fases)

### Fase 0 — Quick wins (pode ir em PATCH v1.0.5 sem Adaptive)

1. Trocar `Link>Button` → `buttonClassName`  
2. Tokens fal-* no erro/aviso  
3. Filtros compactos + chips (copiar padrão Produtos FL14)  
4. Atalho na guia Produto: `Link` `/admin/aplicacoes?q={sku}`  
5. Encurtar copy do H1 (1 frase)

**Critério:** hub usável e alinhado visualmente; ainda clássico.

### Fase 1 — Shell Adaptive (MINOR v1.1)

1. Extender `WorkspaceModuleKey` + prefs + nav label intacto  
2. `AdminApplicationsPage` → `AdaptiveWorkspace`  
3. Extrair lista primary (mobile cards + desktop table)  
4. Vocabulário Abrir guia / + Guia / Na guia  
5. Locks FL16 (moduleKey applications + Adaptive)

### Fase 2 — `ApplicationWorkSurface`

1. Mover create / edit anos / swap veículo / delete para a guia  
2. Empilhar guias (`useIdSplitTabs`) por `applicationId`  
3. Bulk delete na guia quando seleção  
4. Antiregress FL17 (surface + sem create mid-page)

### Fase 3 — Unificação PVC UI

1. Extrair cascata motor/versão compartilhada (hub + `AdminProductApplicationsSection`)  
2. Mesma validação anos / copy coringa  
3. Guia Produto: botão “Abrir no hub Aplicações” com q

### Fase 4 — VAL / smoke

Checklist espelho v104: filtros compactos · Abrir guia · editar período · + Guia · Fechar → full · import intacto · Liberar com app · Central/Painel regressão.

---

## 6. Mapa de arquivos (Fase 1–2)

| Arquivo | Ação |
|---------|------|
| `adminWorkspacePrefs.ts` | + `applications` |
| `falUiLayoutAntiregress.test.ts` | FL16–FL17 |
| `AdminApplicationsPage.tsx` | Refatorar para Adaptive + primary |
| `components/admin/applications/ApplicationWorkSurface.tsx` | **Novo** |
| `AdminProductApplicationsSection.tsx` | Compartilhar helpers; atalho hub |
| `ProductWorkSurface.tsx` | Link hub com `?q=` |
| `FAL_PADRAO_TELAS…` | Changelog MINOR v1.1; remover “Aplicações hub clássico” |
| CSS `index.css` | `admin-applications-list-mobile/desktop` compact |

---

## 7. Anti-objetivos

- Não mudar schema PVC / RPCs  
- Não remover import planilha  
- Não exigir Adaptive em Categorias/Promo nesta marcha  
- Não copiar OrderOpsSurface  
- Não editar apps-manual de kit sem productId  

---

## 8. Critérios de aceite (pós B)

- [ ] `/admin/aplicacoes` usa `AdaptiveWorkspace` `moduleKey="applications"`  
- [ ] Filtros compactos por padrão; chips ativos  
- [ ] Criar / editar período / swap só na guia (ou full ficha) — **não** form permanente no primary  
- [ ] + Guia empilha 2 aplicações  
- [ ] Mobile: cards no primary compact  
- [ ] Sem Link>Button; tokens fal-*  
- [ ] `pnpm test:ui-layout-antiregress` verde (FL1–FL17)  
- [ ] Domínio: criar/editar/excluir/import/Liberar intactos  

---

## 9. Veredito auditoria

O hub Aplicações é **funcional e rico**, mas está **fora do zin** (form mid-page, filtros sempre abertos, edição na grade, tokens genéricos, sem empilhar).  
**Plano:** Fase 0 (PATCH polish) → Fase 1–2 (MINOR Adaptive + WorkSurface) → Fase 3 unificar PVC → VAL.

**Próximo passo:** gate eFe — autorizar **só Fase 0**, **B completo v1.1**, ou **Fase 0+1** agora.

**Assinatura:** auditoria + plano re-layout Aplicações · 2026-11-21 · `dev`
