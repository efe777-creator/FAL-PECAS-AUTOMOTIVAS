# Spec — Painel FAL Mobile + Personalizar (Edit in-place)

Data: 2026-11-17  
Branch: `dev`  
Refs: Splunk (organização) · Simplifi (interação) · Evolution FAL

## Decisões travadas

| Tema | Valor |
|------|--------|
| Personalização | Edit in-place (widgets visíveis + alça) |
| Densidade | Balanced |
| Barra edição | Inferior fixa: Cancelar + Salvar |
| Widgets em edição | Contorno + fundo + indicação de posição (accent discreto) |
| Indicadores | Adaptativo: 2 col compactos / full detalhados |
| Persistência | Draft até Salvar; Cancelar restaura; Salvar só se dirty |

## Tela 1 — Visualização

1. Cabeçalho operacional enxuto  
2. Período + Atualizar + Personalizar  
3. Indicadores (grid adaptativo)  
4. Widgets/análises em fluxo vertical; evitar scrollbars concorrentes

## Tela 2 — Personalizar

- Estado EDITANDO + hint de alça  
- Alça ≥44px; card inteiro **não** é handle  
- Drag: destaque + sombra + slot de destino  
- Barra inferior fixa (safe-area): Cancelar | Salvar (disabled se !dirty)

## Estados

idle → Personalizar → draft → (drag/drop | add | remove) → dirty → Salvar (persist) | Cancelar (restore) → idle

## Técnico

- `react-grid-layout` 2.3; drag ligado em **todos** os breakpoints em edição  
- Resize off em `sm` (1 col)  
- Persistência canônica 12-col (`lg`); ordem `sm` mapeada de volta  
- Drag não depende de largura útil &lt; 768 (bug sintoma A)

## Aceite

- PC: alça move e Salvar/F5 persiste  
- Phone: alça reordena; Cancelar/Salvar; highlight  
- Central: scroll interno da lista perceptível  
