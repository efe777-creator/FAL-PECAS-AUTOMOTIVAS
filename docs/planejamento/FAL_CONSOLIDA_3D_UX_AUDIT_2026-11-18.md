# Auditoria UX / Layout / Responsividade — Módulo Visual (Garagem)

Data: 2026-11-18 · ambiente local `5173` · Fiat Palio 2015 · `dev`  
Escopo: Visual + hero 2D + viewer GLB (não é polish Fase 7 completo).

## Veredito

**Funções core: PASS.**  
**Layout/usabilidade cliente: PARCIAL — usável, mas ainda “técnico/dev”, não “produto fácil”.**  
**Responsividade: PARCIAL — não quebra (sem overflow horizontal), mas alvos de toque e densidade precisam polish.**

---

## O que está funcionando (garantido)

| Função | Evidência |
|--------|-----------|
| Hero 2D CarImages + disclaimer | Mobile/desktop: foto Palio + “não é foto do seu carro” |
| Engine → GLB aprovado | `Engine · resolvido: 3D GLB (asset aprovado)` |
| Orbit / zoom / 7 presets | Presets no DOM; status `ready · órbita · zoom` |
| Sync G7 no modelo | TDI1006 “no modelo (2A)” + marcador verde |
| Fallback copy Visual≠fato | Rodapé GLB e disclaimer 2D |
| Mobile sem scroll horizontal da página | `scrollWidth === clientWidth` @ 390px |
| Nav de módulos em mobile | `overflow-x` (885 > 362) — scroll lateral OK |
| Canvas mobile | ~360×280, `touch-action: none` |

---

## Problemas de usabilidade / design (por gravidade)

### P0 — Confusão de produto (o usuário entende errado)

1. **Foto realista (CarImages) vs cubo smoke 3D**  
   Hero mostra Palio vermelho; o viewer mostra caixa cinza. Parece bug, não “smoke técnico”.  
   *Mitigação UX:* badge grande “Modelo 3D provisório / placeholder” + esconder smoke em AUTO se qualidade < limiar, ou priorizar 2D até ter GLB real.

2. **Controles de pintura/rodas/acabamento com GLB ativo**  
   Decisão v1: GLB **não** recolor. Mas o formulário “Cor da carroceria / Rodas / Acabamento” continua editável — usuário muda cor e **nada muda no 3D**.  
   *Fix:* desabilitar ou ocultar esses campos quando `renderSource === 'glb'`, com texto “Pintura aplica só na silhueta/procedural; o modelo 3D aprovado não é personalizado na v1.”

3. **Copy interna demais**  
   “Visualization Engine”, “2B”, “G7”, “GLB”, “asset aprovado”, “installed_declared” — linguagem de engenharia no fluxo cliente.  
   *Fix:* copy humana (“Visualização”, “Espelhar peças instaladas”, “Modelo 3D”).

### P1 — Layout / hierarquia

4. **Viewer não é o herói do módulo Visual**  
   Ordem atual: disclaimer longo → toggles → sync → XR → **só então** canvas. Em mobile o 3D fica abaixo da dobra.  
   *Fix:* canvas primeiro; preferências em accordion “Avançado”.

5. **9 abas de módulo**  
   Scroll horizontal em 390px; Visual fica escondido à direita.  
   *Fix (Fase 7):* agrupar (ex. “Veículo / Histórico / Visual / Mais”) ou chip sticky “Visual”.

6. **Rodapé técnico do GLB em uppercase**  
   Dense, código do asset, status machine-readable. OK para ADM; ruído para cliente.

7. **Alvos de toque < 44px**  
   Medidos @390: viewer `auto/2d/3d` ~26px altura; presets ~26px; Editar/Remover ~34–36px.  
   *Fix:* `min-h-10` / `min-h-11` nos controles do Visual.

### P2 — Responsividade / polish

8. Canvas altura fixa ~280 em mobile — ok para v1; em desktop poderia ser maior (aspect 16:9).  
9. Presets wrap OK no mobile; sem estado visual “ativo” no ângulo atual.  
10. Sem hint explícito “Arraste para girar · pinça para zoom” no mobile (só aria-label).  
11. Sidebar conta + bottom nav + header = muita chrome; conteúdo útil compete por espaço (sistema legado da conta — Fase 7).

---

## Matriz rápida

| Critério | Nota | Nota |
|----------|------|------|
| Função 3D load/orbit/presets | 4/5 | Funciona; asset é placeholder |
| Função 2D stock | 5/5 | CarImages + disclaimer claros |
| Clareza do que o usuário vê | 2/5 | Foto vs cubo + jargão |
| Facilidade mobile | 3/5 | Cabe, toques pequenos, scroll longo |
| Responsividade estrutural | 4/5 | Sem quebra horizontal |
| Consistência visual FAL | 3/5 | Padrões FAL ok; densidade alta |

---

## Recomendações (ordem sugerida — sem abrir Fase 7 inteira)

1. **Quick wins (1–2h):** copy humana; ocultar/desabilitar pintura no modo GLB; hint “arraste/gire”; `min-h-10` nos presets/viewer; badge “3D provisório” no smoke. → **feito em `dev` (2026-11-20)**  
2. **Layout Visual:** promover canvas ao topo do módulo. → **feito**  
3. **P2 polish:** preset ativo; hint mobile no canvas; aspect 16:9 / min-h desktop. → **feito**  
4. **Conteúdo:** trocar smoke box por GLB real curado (bloqueia percepção de “quebrado”). → **aberto**  
5. **Fase 7:** reorganizar abas da Garagem + chrome da conta. → **aberto**

## Conclusão

O pipeline **está operacional** (2D + 3D + sync + controles).  
Para o cliente final, **ainda não parece um visualizador automotivo fácil**: o maior gap não é CSS quebrado — é **hierarquia + linguagem + asset placeholder vs foto realista**.
