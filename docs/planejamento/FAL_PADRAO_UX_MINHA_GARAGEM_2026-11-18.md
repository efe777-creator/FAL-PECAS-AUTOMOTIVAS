# FAL — Padrão UX Minha Garagem

**Data:** 2026-11-18  
**Status:** CANÔNICO (layout + caminhos + textos)  
**Branch destino:** `dev`  
**Referência visual:** mockup bento (estrutura); cores FAL (não roxo do mockup)

---

## 1. Princípios

1. Uma ação óbvia por tela.
2. Hierarquia: carro dominante; widgets secundários.
3. Toque generoso (`min-h-11`).
4. Honestidade: ilustração ≠ foto do carro; cuidados ≠ diagnóstico.
5. Um caminho por intenção; um rótulo por conceito.

---

## 2. Agora vs depois

| Agora | Depois (fase 2) |
|-------|-----------------|
| Km, status, próximos cuidados (óleo) | Widgets personalizáveis |
| Histórico no tempo (compras/registros) | Bottom nav do mockup (opcional) |
| Resumo + Histórico + Cuidados + **Peças** + Mais | — |
| Peças compatíveis (confirmadas) com split lista/detalhe | — |
| Voltar → catálogo (c/ filtros) ou conta | — |

Ficha “parceiros” completa **não** é a jornada principal agora. Código dos módulos avançados permanece acessível em **Mais**.

---

## 3. Layout

- **Shell:** sidebar navy + item ativo amarelo; header com Voltar + seletor de veículo.
- **Home:** bento — hero, próximos cuidados, histórico recente, preview visual secundário, resumo enxuto.
- **Detalhe:** stage do carro + abas Resumo | Histórico | Cuidados | **Peças** | Mais.
- **Peças:** desktop split lista | detalhe (`lg:grid-cols-[1fr_minmax(320px,400px)]`); mobile stack com Voltar interno.
- **Tokens:** `--fal-navy`, `--fal-yellow`, `--fal-accent`, `--fal-success` em `fal-pecas/src/styles/index.css`.
- **Tema:** interruptor do cabeçalho da loja (um só).

---

## 4. Mapa de caminhos (um por intenção)

| Intenção | Caminho único |
|----------|----------------|
| Home da garagem | Sidebar/atalho **Garagem** |
| Ver o carro | CTA **Ver carro** → Resumo |
| Histórico | Nav/aba **Histórico** (widgets só deep-link) |
| Lembretes / óleo | Nav/aba **Cuidados** |
| Peças que cabem no carro | Nav/aba/CTA **Peças** → `?modulo=pecas` |
| Catálogo completo (escape) | Só no rodapé do módulo Peças → **Catálogo completo** |
| Avançado | **Mais** → Visual, Profissionais, Evidências, Compartilhar, Config, Manutenção |
| Sair da garagem | Botão **Voltar** (origem real) |

Entrada externa pela loja (`MobileNav` Garagem) permanece válida.

---

## 5. Glossário (cliente)

| Conceito | Usar | Evitar |
|----------|------|--------|
| Área | Minha Garagem / Garagem | Dashboard, workspace, 2A |
| Tela do carro | Resumo | Visão geral, ficha, identity |
| Lembretes | Cuidados / Próximos cuidados | Inteligência, FAL IA, Engine |
| Linha do tempo | Histórico | Timeline, G7 |
| Peças do veículo | **Peças compatíveis** / **Peças** | Peças no catálogo (espalhado), Ver peças, Produtos/compatibilidade |
| Escape catálogo | **Catálogo completo** (1× no módulo Peças) | Abrir catálogo filtrado (vários lugares) |
| Peças no 3D | **No modelo** / **Peças no visual** (só Visual/Mais) | Peças FAL no veículo (ambíguo) |
| CTA hero | Ver carro | Ver detalhes do veículo |
| Empty cuidados | Nenhum cuidado agendado. Adicione um lembrete. | Cadastre na Inteligência |
| Empty peças | Selecione ou complete o veículo. / Nenhuma peça confirmada. | — |
| Subtítulo home | Seu carro, cuidados e histórico. | Dashboard do veículo… |
| Visual | Visualização / Modelo 3D | Visualization Engine, GLB, 2B |
| Voltar | Voltar | Voltar à conta + Voltar |

Regra: no máximo um título “Minha Garagem” visível por viewport (sidebar no desktop).

---

## 6. Anti-padrões

- Roxo do mockup
- Jargão de engenharia na superfície
- Sidebar longa + abas longas + grade mobile repetindo os mesmos 9 módulos
- Dois controles de “voltar”
- Card “FAL Inteligência” separado de “Próximos cuidados”
- Múltiplos CTAs “Peças no catálogo” saindo da garagem (usar `modulo=pecas`)
- Badge de compatibilidade só com apps truncadas (confirmadas exigem PVC + `classifyCompatibility`)

---

## 7. Evidência de implementação

- `fal-pecas/src/lib/garageNav.ts`
- `fal-pecas/src/lib/garageWorkspacePrefs.ts` (`pecas`)
- `fal-pecas/src/components/garage/GarageShell.tsx`
- `fal-pecas/src/components/garage/GarageDashboardBento.tsx`
- `fal-pecas/src/components/garage/VehicleCompatiblePartsPanel.tsx`
- `fal-pecas/src/pages/Account/AccountVehicleDetailPage.tsx`
- `fal-pecas/src/lib/garageNavStack.ts` + `GarageBackButton` / `GarageNavTracker`
