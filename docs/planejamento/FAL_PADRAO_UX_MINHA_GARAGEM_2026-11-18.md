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
| Km, status, próximos cuidados (óleo) | Listagem de peças do veículo com foto |
| Histórico no tempo (compras/registros) | Tela dividida ao abrir peça |
| Resumo + Histórico + Cuidados + Mais | Widgets personalizáveis |
| Voltar → catálogo (c/ filtros) ou conta | Bottom nav do mockup (opcional) |

Ficha “parceiros” completa **não** é a jornada principal agora. Código dos módulos avançados permanece acessível em **Mais**.

---

## 3. Layout

- **Shell:** sidebar navy + item ativo amarelo; header com Voltar + seletor de veículo.
- **Home:** bento — hero, próximos cuidados, histórico recente, preview visual secundário, resumo enxuto.
- **Detalhe:** stage do carro + abas Resumo | Histórico | Cuidados | Mais.
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
| Avançado | **Mais** → Visual, Profissionais, Evidências, Compartilhar, Config, Manutenção |
| Sair da garagem | Botão **Voltar** (origem real) |
| Comprar no catálogo | CTA **Peças no catálogo** |

Entrada externa pela loja (`MobileNav` Garagem) permanece válida.

---

## 5. Glossário (cliente)

| Conceito | Usar | Evitar |
|----------|------|--------|
| Área | Minha Garagem / Garagem | Dashboard, workspace, 2A |
| Tela do carro | Resumo | Visão geral, ficha, identity |
| Lembretes | Cuidados / Próximos cuidados | Inteligência, FAL IA, Engine |
| Linha do tempo | Histórico | Timeline, G7 |
| CTA hero | Ver carro | Ver detalhes do veículo |
| CTA catálogo | Peças no catálogo | Ver peças (ambíguo) |
| Empty cuidados | Nenhum cuidado agendado. Adicione um lembrete. | Cadastre na Inteligência |
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

---

## 7. Evidência de implementação

- `fal-pecas/src/lib/garageNav.ts`
- `fal-pecas/src/components/garage/GarageShell.tsx`
- `fal-pecas/src/components/garage/GarageDashboardBento.tsx`
- `fal-pecas/src/pages/Account/AccountVehicleDetailPage.tsx`
- `fal-pecas/src/lib/garageNavStack.ts` + `GarageBackButton` / `GarageNavTracker`
