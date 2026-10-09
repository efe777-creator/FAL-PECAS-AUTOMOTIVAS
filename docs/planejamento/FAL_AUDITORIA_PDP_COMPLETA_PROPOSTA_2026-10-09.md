# Auditoria + proposta — PDP completa FAL 3.0

**Data:** 2026-10-09  
**Modo:** somente leitura / proposta — **sem implementação de código**  
**Runtime canônico:** `wtbpwuiayednvlhvuhbh`  
**FIND-004 dados:** ENCERRADO (M1–M5) — não reaberto  
**Git:** `dev` ≡ `main` @ `e5e4125`  
**Próximo gate:** autorização explícita `MARCHA PDP-A`

---

## 1. Documentos consultados

| Doc | Uso |
|-----|-----|
| [FAL_CONTRATO_PDP_v0.1_2026-10-09.md](./FAL_CONTRATO_PDP_v0.1_2026-10-09.md) | Contrato domínio aceito; redesign F11 fora |
| [FAL_IMP_11_PDP_VAL_2026-10-09.md](./FAL_IMP_11_PDP_VAL_2026-10-09.md) | VAL domínio (rótulos/preço/apps/CTA) |
| [FAL_IMP_11_VISUAL_IMPORT_DIAGNOSTICO_2026-10-09.md](./FAL_IMP_11_VISUAL_IMPORT_DIAGNOSTICO_2026-10-09.md) §7.2/§18 | Gaps mockup; spec HTML dedicada não encontrada |
| [FAL_MARCHA_UI_APPS_ANOS_VAL_2026-10-09.md](./FAL_MARCHA_UI_APPS_ANOS_VAL_2026-10-09.md) | Anos YY + limiar card 4 / PDP 8 |
| [FAL_IMP_19_UX_VAL_2026-10-09.md](./FAL_IMP_19_UX_VAL_2026-10-09.md) | ErrorState PDP ≠ 404 |
| [STATUS_ONDA1_2026-10-09.md](./STATUS_ONDA1_2026-10-09.md) / [molde](./FAL_STATUS_CONSOLIDADO_MOLDE_2026-10-09.md) | Status operacional |
| PRD / Fase 3 (refs no contrato) | Domínio catálogo público |

**Molde / protótipo HTML de PDP:** **não localizado** no repositório. Único HTML: `fal-pecas/index.html` (shell Vite). Mockup “responsável 2026-10-09” citado em docs, **sem artefato versionado**.

---

## 2. Rota e componentes atuais (FATO)

| Item | Evidência |
|------|-----------|
| Rota | `/produto/:id` — `fal-pecas/src/app/router.tsx` |
| Página | `fal-pecas/src/pages/Product/ProductPage.tsx` |
| Apps UI | `CompatibilityAppsBlock` `variant="pdp"` |
| Card alinhado | `ProductCard.tsx` + mesmos labels/preço/apps |
| Admin imagens | `adminImageService.ts` (Storage `product-images`) — loja não consome |

---

## 3. Fluxo de dados (FATO)

```text
/produto/:id
  → getProductById(id)
      → products (published) + product_brands + product_categories
      → product_references (active)
      → attachCompatibilitySummaries (maxMakers/maxLines = null)
      → attachResolvedPrices
  → ProductPage: identidade, preço, apps, carrinho, favorito, WhatsApp (se env)
```

| Domínio | Fonte | PDP hoje |
|---------|-------|----------|
| Identidade | `name`, `commercial_ref\|\|sku` | OK |
| Preço | `displayPrice` / resolve | OK |
| Apps | PVC → groups | OK (limiar UI 8) |
| Anos | `formatVehicleAppYear` | OK YY/YY · YY/... |
| Carrinho | `CartContext` | OK |
| `imageUrl` | UI espera; **não populado** em `mapProduct`/`getProductById` | Gap |
| Descrição | schema `short_description`/`description` | **não renderiza** |
| Specs/attrs | tipo `Product.attrs` | **não lista** |
| Relacionados | — | inexistente |
| Frete / MP | — | bloqueados (paralelos) |

---

## 4. Atual vs estrutura proposta (prompt mestre)

| Bloco | Status | Classe |
|-------|--------|--------|
| Header/busca | Reutilizado | FATO OK |
| Identificação | Domínio v0.1 + MARCHA UI | FATO OK |
| Galeria + thumbs | Placeholder; sem wire `product_images` | FATO gap |
| Área compra | OK; sem parcelamento inventado | FATO OK |
| Compatibilidade 8 + Mais | OK | FATO OK |
| Anos YY | OK | FATO OK |
| Especificações | parcial (posicao/lado/refs) | FATO gap parcial |
| Descrição | schema sim; UI não | FATO gap |
| Entrega/políticas | só Disponível | FATO / dep. |
| WhatsApp ajuda | se `VITE_WHATSAPP_PHONE` | FATO condicional |
| Relacionados | — | futuro |
| Sticky buy mobile | não | HIPÓTESE UX |

**Residual usabilidade:** carrinho exibe `Código {sku}` (`CartPage.tsx`); PDP/card usam `Referência:`.

---

## 5. Lacunas / hipóteses / decisões

**Lacunas (FATO):** (1) storefront sem `product_images`→`imageUrl`; (2) descrição não na PDP; (3) sem seção specs/`attrs`; (4) sem galeria N>1; (5) rótulo Código vs Referência no carrinho.

**Hipóteses:** volume real de fotos/descrições no wtbp; sticky buy vs nav mobile inferior.

**Decisões para a MARCHA:** layout incremental FAL (não F11/ML); zoom só se necessário; relacionados só com regra de dados.

---

## 6. Reutilizar

`CompatibilityAppsBlock`, `vehicleAppYear`, `productLabels`, `displayPrice`/`CartContext`, padrão `adminImageService` publicUrl, Button/Container/Loading/ErrorState/EmptyState, Header/Footer.

---

## 7. Proposta de MARCHAS (após auth)

### MARCHA PDP-A — Completude de dados (prioridade)

Sem redesign ML, sem schema, sem frete/MP:

1. `attachPrimaryProductImages` em `getProductById` (+ list/search se necessário).
2. PDP: `shortDescription`/`description` se não vazios (texto plain).
3. Seção Especificações só com campos existentes.
4. Ajuda discreta (código/ano/versão) + WhatsApp se env.
5. Carrinho: alinhar rótulo `Referência` (escopo mínimo).
6. Vitest + smoke; VAL `FAL_MARCHA_PDP_A_VAL_*.md`.

**Proibido em A:** migrations, FIND-004, frete, MP, thumbs inventadas, relacionados aleatórios, docs mestres sem auth.

### MARCHA PDP-B — Layout e-commerce FAL (após VAL A)

Galeria + thumbs se N>1; hierarquia desktop/mobile; sticky buy só se caber no padrão; tokens FAL; sem cópia ML.

### Fora / paralelos

Frete → D-FRETE/IMP-14–15 · MP → smoke humano · FIND-004 reviews · migrations/PVC.

---

## 8. Arquivos prováveis (pós-auth)

| Fase | Arquivos |
|------|----------|
| A | `productService.ts`, `searchService.ts`, `ProductPage.tsx`, possível `productImages.ts`, `CartPage.tsx`, testes, VAL |
| B | `ProductPage.tsx`, `ProductGallery.tsx`, layout mobile |

---

## 9. Riscos

Regredir apps/preço/carrinho → reusar serviços. Inventar foto/desc → só dados reais. Escopo F11+frete → cortes A/B. Perf catálogo → só primária na lista.

---

## 10. Matriz de testes (pós-auth)

Produto completo / sem imagem / sem desc / 404 / erro; add qty/carrinho; apps 1/=8/>8; anos YY; desktop+mobile; teclado no Mais aplicações.

---

## 11. STOP

**Entrega desta fase:** auditoria + proposta (este doc).  
**Código:** não alterado.  
**Aguardando:** `MARCHA PDP-A` explícita para iniciar implementação.
