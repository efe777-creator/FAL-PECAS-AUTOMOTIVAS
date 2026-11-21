# Auditoria cruzada — Jornada operador Catálogo / Kits / Preços

**Data:** 2026-11-21 · Estudo (atualizado: frente Kits)  
**Objetivo:** cruzar docs existentes + código + estudos TO-BE; matriz do que **não pode quebrar**.

## 1. Pacote deste estudo

| Doc | Papel |
|------|--------|
| [FAL_ESTUDO_PRODUTOS_WORKSPACE_TOBE_2026-11-21.md](./FAL_ESTUDO_PRODUTOS_WORKSPACE_TOBE_2026-11-21.md) | AS-IS + TO-BE Produtos |
| [FAL_ESTUDO_KITS_WORKSPACE_TOBE_2026-11-21.md](./FAL_ESTUDO_KITS_WORKSPACE_TOBE_2026-11-21.md) | AS-IS + TO-BE Kits (criação + BOM) |
| [FAL_ESTUDO_LISTAS_PRECO_WORKSPACE_TOBE_2026-11-21.md](./FAL_ESTUDO_LISTAS_PRECO_WORKSPACE_TOBE_2026-11-21.md) | AS-IS + TO-BE Preços |
| [FAL_JORNADA_PRODUTO_PRECO_INTEGRACAO_2026-11-21.md](./FAL_JORNADA_PRODUTO_PRECO_INTEGRACAO_2026-11-21.md) | Handoff cruzado |
| [FAL_SPEC_CATALOGO_PRECOS_WORKSPACE_2026-11-21.md](./FAL_SPEC_CATALOGO_PRECOS_WORKSPACE_2026-11-21.md) | Spec Cursor mestre |
| [FAL_PADRAO_ADAPTIVE_CENTRAL_PAINEL_CATALOGO_2026-11-21.md](./FAL_PADRAO_ADAPTIVE_CENTRAL_PAINEL_CATALOGO_2026-11-21.md) | Padrão zin já vivo (Central + Painel) → catálogo |

## 2. Cruzamento doc ↔ status

| Fonte | Tema | Status vs este estudo |
|-------|------|------------------------|
| [FAL_SPEC_ADAPTIVE_WORKSPACE_2026-11-17.md](./FAL_SPEC_ADAPTIVE_WORKSPACE_2026-11-17.md) | Shell split; Fase 1 = Pedidos + Painel; **fora:** Adaptive outros módulos | **Extensão proposta** pós-gate — prefs `products`/`prices`/`kits` |
| [FAL_MARCHA_ADAPTIVE_WORKSPACE_VAL_2026-11-17.md](./FAL_MARCHA_ADAPTIVE_WORKSPACE_VAL_2026-11-17.md) | Preview RO original | Evoluído por OrderOps mutável — TO-BE catálogo segue **híbrido** (guia leve + full) |
| [FAL_MARCHA_ORDER_OPS_SURFACE_VAL_2026-11-19.md](./FAL_MARCHA_ORDER_OPS_SURFACE_VAL_2026-11-19.md) | Surface compact no split | **Não copiar** OrderOps; reusar só shell + vocabulário |
| [FAL_MAPA_JORNADA_CENTRAL_PEDIDOS_2026-11-11.md](./FAL_MAPA_JORNADA_CENTRAL_PEDIDOS_2026-11-11.md) | Jornada pedidos | Referência interação |
| [PROMPT_MESTRE_FASE8_1_LISTAS_PRECOS.md](./PROMPT_MESTRE_FASE8_1_LISTAS_PRECOS.md) + F8.2/F8.4 | Listas, consulta, abas | **Preservar** capacidades; mover QuickAdjust para guia |
| [FAL_MARCHA_PRECOS_ADMIN_UX_VAL_2026-10-10.md](./FAL_MARCHA_PRECOS_ADMIN_UX_VAL_2026-10-10.md) | UX edição preços | Não regredir |
| [AUDITORIA_INTEGRAL_KITS…](./AUDITORIA_INTEGRAL_KITS_ITENS_PROMOCOES_FAL.md) §20 | Admin kits; anti painel Kits Ops paralelo | **Respeitado** — hub `/admin/kits` |
| [FAL_KITS_K0…](./FAL_KITS_K0_DECISOES_FECHADAS_2026-11-20.md) H8/H5/H9 | Hub kits; lista manual; promo SKU kit | **Respeitado** |
| [FAL_KITS_HUB_PROMO_SMOKE_VAL_2026-11-21.md](./FAL_KITS_HUB_PROMO_SMOKE_VAL_2026-11-21.md) | Promo itens≠kits | Fora do split; não quebrar |
| [FAL_MARCHA_PRODUTOS_ALTERACOES_GLOBAIS…](./FAL_MARCHA_PRODUTOS_ALTERACOES_GLOBAIS_VAL_2026-11-04.md) | Bulk | Mover para guia, não remover |
| Marches O1I nav/RBAC | Menu por papel | Labels futuros sem mudar paths |
| [FAL_MVP_MAPA_TELAS_JORNADAS.md](./FAL_MVP_MAPA_TELAS_JORNADAS.md) | Mapa geral | Atualizar ponteiro pós-impl |

## 3. Matriz NÃO QUEBRAR

| ID | Invariante | Evidência | Risco TO-BE |
|----|------------|-----------|-------------|
| NQ1 | Base/Promo não excluíveis | UI + IDs fixos | Baixo se menus ⋯ preservados |
| NQ2 | kits-manual → `/admin/kits/precos` | Detail redirect + overview badge | Médio se guia Preços abrir essa lista |
| NQ3 | `resolve_product_price` inalterado | Service + SQL | Só UI |
| NQ4 | Checklist D-LIBERAR hard/soft | `releaseChecklist.ts` | Guia deve reusar mesmas APIs |
| NQ5 | Bulk medidas/classificar/liberar | AdminProductsPage | Extrair UI, mesmos services |
| NQ6 | sessionStorage QuickAdjust + detail filters | fal.priceList* | Migrar chave/comportamento |
| NQ7 | F8 abas `?tab=` | router + detail | Full page intacta |
| NQ8 | Import wizard 0–9 + max 2000 | PriceImportWizard | Continua modal |
| NQ9 | Promo gate + abas itens/kits | AdminPromotionsPage | Fora desta UX |
| NQ10 | Workspace prefs ≠ RGL dashboard | adminWorkspacePrefs | Novas keys só |
| NQ11 | RBAC preços = MGMT | adminNavAccess | Sem abrir mutação a operador |
| NQ12 | Produto kind kit → hub kits | Form redirect | Guia Produtos não edita kit |
| NQ13 | Origens calculated/imported/manual | adminPriceListService | Sem mudar RPCs |
| NQ14 | OrderOps / Central intactos | Adaptive orders | Não compartilhar surface |
| NQ20 | Painel RGL ⊥ workspace | adminWorkspacePrefs vs dashboard layout | Novas keys não tocam RGL |
| NQ21 | Compact primary operável | VAL OrderOps overflow fix | Repetir smoke +Guia em catálogo |
| NQ15 | H2 composição mínima | `isKitCompositionPublishable` | Picker não contorna checklist |
| NQ16 | H6 PVC review flag | banner + Liberar | Mantém bloqueio |
| NQ17 | BOM só itens; merge qty; events | adminProductKitService | Multi-add usa mesmo service |
| NQ18 | Sem composição sem productId | Form gate | Rascunho rápido ainda gera ID real |
| NQ19 | apps PVC no kit (gap AS-IS) | Liberar hard hasApplication | TO-BE adiciona seção — não remove regra |

## 4. Gaps / coerência

| Gap | Resolução no estudo |
|-----|---------------------|
| Spec Adaptive “fora outros módulos” | Spec mestre declara **Fase Catálogo** como extensão autorizada pós-gate eFe |
| Preview RO vs mutação | Política explícita: mutações leves na guia; ficha/detalhe = full |
| Preço grade ≠ loja | TO-BE Produtos: preferir resolvido na lista |
| Config lista duplicada | TO-BE: overview curta na guia; avançado só `?tab=config` |
| Anti Kits Ops | Mantido |

## 5. Código âncora (snapshot)

- `WorkspaceModuleKey` hoje: `'orders' \| 'dashboard'` — estender com `products` \| `prices` \| `kits` na implantação.  
- Adaptive: `fal-pecas/src/components/admin/workspace/*`  
- Produtos / Kits / Preços: pages admin citadas nos estudos.

## 6. Conclusão auditoria

Estudos TO-BE (Produtos + **Kits** + Preços) são **coerentes** com F8, K0, Adaptive e RBAC, desde que a implantação:

1. Não altere domínio de preço/pedido/regras BOM K0.  
2. Filtre kits-manual fora da guia de listas.  
3. Reuse services (Liberar, BOM add/merge, QuickAdjust, F8).  
4. Feche gap PVC (apps) na ficha kit sem herdar dos componentes.  
5. Melhore picker/criação **sem** órfãos sem `productId`.  
6. VAL regressão Central + Kits hub + Promo + loja.

**Próximo:** aprovação eFe da [spec mestre](./FAL_SPEC_CATALOGO_PRECOS_WORKSPACE_2026-11-21.md) antes de qualquer PR de UI.
