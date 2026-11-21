# FAL — Padrão UX Minha Garagem

**Data:** 2026-11-18 · **Emenda:** 2026-11-21 (fundação coerente)  
**Status:** CANÔNICO (layout + caminhos + textos)  
**Branch destino:** `dev`  
**Referência visual:** mockup bento (estrutura); cores FAL (não roxo do mockup)  
**Plano operacional:** [FAL_PLANO_GARAGEM_FUNDACAO_COERENTE_2026-11-21.md](./FAL_PLANO_GARAGEM_FUNDACAO_COERENTE_2026-11-21.md)

---

## 1. Princípios

1. Uma ação óbvia por tela.
2. Hierarquia: carro dominante; widgets secundários.
3. Toque generoso (`min-h-11`).
4. Honestidade: ilustração ≠ foto do carro; cuidados ≠ diagnóstico.
5. Um caminho por intenção; um rótulo por conceito.
6. Fundação atual: identificar → ver 2D → peças que cabem → **compras FAL no veículo**.

---

## 2. Agora vs depois

| Agora (fundação 2026-11-21) | Depois (parceiros / onda futura) |
|------------------------------|----------------------------------|
| Hero 2D (pessoal → stock local → placeholder) | CDN paga (IMAGIN etc.) se contratada |
| Histórico = **só peças compradas** na FAL no veículo | Timeline vida + manutenção + km |
| Resumo + Histórico + **Peças** + Mais | Cuidados / lembretes na primária |
| Peças compatíveis (confirmadas) com split lista/detalhe | — |
| Cuidados, Manutenção, Profissionais, Evidências em **Mais → Avançado** | Hub parceiros / oficina |
| Visual 2D-first; 3D só GLB real opt-in | XR / biblioteca GLB ampla |
| Voltar → catálogo (c/ filtros) ou conta | — |

**CarImages:** cancelada — não usar. Stock = `vehicle_stock_images` + foto pessoal.  
Ficha “parceiros” completa **não** é a jornada principal agora. Código 2A permanece acessível em **Mais → Avançado**.

---

## 3. Layout

- **Shell:** sidebar navy + item ativo amarelo; header com Voltar + seletor de veículo.
- **Home:** bento — hero 2D, últimas peças compradas (G7), sem widget “próximos cuidados” / km protagonista.
- **Detalhe:** stage do carro + abas **Resumo | Histórico | Peças | Mais**.
- **Peças:** desktop split lista | detalhe (`lg:grid-cols-[1fr_minmax(320px,400px)]`); mobile stack com Voltar interno.
- **Tokens:** `--fal-navy`, `--fal-yellow`, `--fal-accent`, `--fal-success` em `fal-pecas/src/styles/index.css`.
- **Tema:** interruptor do cabeçalho da loja (um só).

---

## 4. Mapa de caminhos (um por intenção)

| Intenção | Caminho único |
|----------|----------------|
| Home da garagem | Sidebar/atalho **Garagem** |
| Ver o carro | CTA **Ver carro** → Resumo |
| Peças compradas neste carro | Nav/aba **Histórico** |
| Peças que cabem no carro | Nav/aba/CTA **Peças** → `?modulo=pecas` |
| Catálogo completo (escape) | Só no rodapé do módulo Peças → **Catálogo completo** |
| Visualização / fotos / avançado | **Mais** → Visualização (1º), Config, Compartilhar, **Avançado** (Cuidados, Manutenção, Profissionais, Evidências) |
| Sair da garagem | Botão **Voltar** (origem real) |

Entrada externa pela loja (`MobileNav` Garagem) permanece válida.

---

## 5. Glossário (cliente)

| Conceito | Usar | Evitar |
|----------|------|--------|
| Área | Minha Garagem / Garagem | Dashboard, workspace, 2A |
| Tela do carro | Resumo | Visão geral, ficha, identity |
| Compras no veículo | **Histórico** / Peças compradas | Timeline, G7, manutenção |
| Lembretes (avançado) | Cuidados (só em Mais → Avançado) | Inteligência, FAL IA, Engine |
| Peças que cabem | **Peças** (módulo) | Confundir com Histórico |
| Escape catálogo | **Catálogo completo** (1× no módulo Peças) | Abrir catálogo filtrado (vários lugares) |
| Empty histórico | Quando você comprar peças para este carro na FAL, elas aparecem aqui. | Registre uma manutenção… |
| Empty peças | Selecione ou complete o veículo. / Nenhuma peça confirmada. | — |
| Subtítulo home | Seu carro, peças e compras. | Dashboard… / cuidados e óleo |
| Visual | Visualização / Imagem / Modelo 3D (opt-in) | Visualization Engine, GLB, 2B |
| Voltar | Voltar | Voltar à conta + Voltar |

Regra: no máximo um título “Minha Garagem” visível por viewport (sidebar no desktop).

---

## 6. Anti-padrões

- Roxo do mockup
- Jargão de engenharia na superfície
- Sidebar/abas com **Cuidados** na primária (sem rede parceiros)
- Widget “próximos cuidados” / km como herói da home
- Histórico misturando manutenção manual com compras
- Procedural 3D / cubo como herói visual (preferir 2D stock)
- CarImages / segunda API de placa
- Dois controles de “voltar”
- Múltiplos CTAs “Peças no catálogo” saindo da garagem (usar `modulo=pecas`)
- Badge de compatibilidade só com apps truncadas (confirmadas exigem PVC + `classifyCompatibility`)

---

## 7. Evidência de implementação

- `fal-pecas/src/lib/garageNav.ts`
- `fal-pecas/src/lib/garageWorkspacePrefs.ts` (`pecas`)
- `fal-pecas/src/components/garage/GarageShell.tsx`
- `fal-pecas/src/components/garage/GarageDashboardBento.tsx`
- `fal-pecas/src/components/garage/VehicleCompatiblePartsPanel.tsx`
- `fal-pecas/src/components/garage/VehicleIdentityTimeline.tsx` (compras G7)
- `fal-pecas/src/pages/Account/AccountVehicleDetailPage.tsx`
- `fal-pecas/src/lib/garageNavStack.ts` + `GarageBackButton` / `GarageNavTracker`
- `fal-pecas/src/lib/garageNav.test.ts` (antiregress nav)
