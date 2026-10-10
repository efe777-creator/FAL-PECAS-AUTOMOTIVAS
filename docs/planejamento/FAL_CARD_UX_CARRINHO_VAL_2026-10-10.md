# MARCHA ProductCard — alinhamento + carrinho

**Data:** 2026-10-10  
**Arquivo:** `fal-pecas/src/components/product/ProductCard.tsx`

---

## Entregas

1. `article` com `flex h-full flex-col` — cards da row com mesma altura (grid stretch).
2. Corpo (`Link`) `flex-1`; rodapé `mt-auto` com preço + CTAs alinhados na base.
3. **Adicionar ao carrinho** (`useCart().addItem` + toast) — primary; disabled se indisponível.
4. **Ver produto** — `variant="light"`.
5. Label `ADICIONAR_AO_CARRINHO_LABEL` em `productLabels.ts` + teste.

Limite 4 linhas + Mais aplicações: inalterado.

---

## Status

| | |
|--|--|
| Implementação | **OK** |
| Unit (`productLabels.test`) | **OK** (7 testes) |
| Smoke visual produção | **OK** 10/10 |

### Smoke visual (produção)

- URL: https://fal-pecas-automotivas.netlify.app/catalogo  
- 24 `article`; alturas iguais na amostra (597px × 4)  
- CTA **Adicionar ao carrinho** + **Ver produto** em todos os cards  
- Click add → badge carrinho **1**  
- Indisponível: nenhum card indisponível na amostra (cenário disabled não observado)
