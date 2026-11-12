# VAL — Confirmação análise · configs e funções Home Comercial

**Data:** 12/11/2026  
**Auth:** eFe — `MARCHA`  
**Projeto:** `wtbpwuiayednvlhvuhbh`

---

## Análise confirmada

| Função / config | Estado remoto | Conclusão |
|-----------------|---------------|-----------|
| `store_home_settings` + `show_oferta_badge` / `show_discount_percent` | Colunas existem; defaults `true`; round-trip OK | **OK** |
| `store_payment_display` | enabled, max 3, min 20, cards/PDP on | **OK** |
| `resolve_product_price` gate Opção A | `product_promotions` no corpo | **OK** |
| `resolve_product_prices` | Delega ao singular (herda gate) | **OK** |
| Gate: item na lista **sem** ativação | resolve → Base `47.25` | **PASS** |
| Lista Promocional | `inactive` (estado ops limpo) | **OK** |
| Carrinho usa `displayPrice` | confirmado no código | **OK** |
| Estimativa frete PDP | `displayPrice` (corrigido na F3) | **OK** |

---

## Gaps corrigidos nesta confirmação

| Gap | Correção |
|-----|----------|
| Cache 5 min de apresentação **não** invalidava após salvar Config | `invalidateHomePresentationCache()` no `adminUpsertHomeSettings` |
| Hook vitrine não reagia a mudança de config na mesma sessão | `useHomePresentation` refetch + bust cache no `focus` |
| Selo off ainda podia persistir `%` | upsert e UI forçam `%` off se selo off |
| Badge pouco exposto a a11y | `role="status"` no `Badge` |

---

## Garantias operacionais

1. **Preço:** lista promocional cadastrada ≠ promoção ativa (gate SQL).  
2. **Config:** selo/% / limite em `store_home_settings` — só apresentação.  
3. **Pagamento display:** teto parcelas em `store_payment_display` — não inventa PIX%.  
4. **Admin Promoções:** B-06 se lista inactive; `Select` com `options`.

**Assinatura:** MARCHA Home configs+funções confirmadas e corrigidas · 12/11/2026.
