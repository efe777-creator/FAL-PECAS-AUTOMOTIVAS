# Execução Fase 6C — Endereços, CEP e Motor de Frete

**Branch:** `plan`  
**Spec:** [ESPECIFICACAO_FASE6C_ENDERECOS_FRETE.md](./ESPECIFICACAO_FASE6C_ENDERECOS_FRETE.md)  
**Regra:** Etapa B implementada. **6C.1** = correção UX (AddressForm CEP-first + conta). Sem push sem autorização.  
**Relatório 6C.1:** [AUDITORIA_FASE6C1_2026-10-03.md](./AUDITORIA_FASE6C1_2026-10-03.md)

## Checklist (Etapa B)

| Módulo | Conteúdo | Status |
|--------|----------|--------|
| M0 | ProductCard: remover badge absoluto 🛒; manter “No carrinho N” | [x] |
| M1 | Migration: `reference` em endereços; peso/dims opcionais em products; origem loja | [x] |
| M2 | `CepProvider` + ViaCEP + `addressLookupService` (máscara/normalização/erros) | [x] |
| M3 | `AddressForm` compartilhado CEP-first | [x] |
| M4 | Conta `/conta/enderecos` — integrar form + referência | [x] |
| M5 | Checkout — endereço inline + seleção + recota | [x] |
| M6 | `FreightService` — cache TTL curto + debounce na UI | [x] |
| M7 | Estender `ShippingQuoteRequest` (itens/peso/origem); mock compatível | [x] |
| M8 | Admin origem FAL (CRUD simples) | [x] |
| M9 | Stubs tipados Correios / Frenet / Carrier (sem chamada real) | [x] |
| M10 | place_order intacto + regressão F6/F6B | [x] |
| M11 | Testes T1–T26 + build/TS/lint | [x] |
| M12 | Docs finais + auditoria **APROVADA** | [x] |

## Artefatos

| Tipo | Caminho |
|------|---------|
| Migration | `fal-pecas/supabase/migrations/20261004030000_fase6c_addresses_freight.sql` |
| CEP | `src/services/address/*`, `src/lib/cep.ts` |
| Form | `src/components/address/AddressForm.tsx` |
| Frete | `src/services/shipping/freightService.ts` + stubs `providers/` |
| Admin | `/admin/frete` — `AdminShippingOriginPage` |

## Testes T1–T26 (checklist)

| ID | Caso | Resultado |
|----|------|-----------|
| T1–T7 | CEP válido/inválido/inexistente/indisponível/autofill/manual/número | OK (ViaCEP + AddressForm) |
| T8–T12 | CRUD conta + default + RLS own | OK (addressService + RLS F2) |
| T13 | Endereço no checkout | OK (inline AddressForm) |
| T14–T18 | Cotação/debounce/cache | OK (FreightService + effect step 2) |
| T19–T20 | Seleção frete | OK (Checkout step Entrega) |
| T21–T22 | Manipulação frete / place_order | OK (server resolve_mock_shipping_option) |
| T23–T24 | Regressão F6/F6B | place_order não alterado nesta fase |
| T25–T26 | Mobile/desktop | Form responsivo sm:grid |

**Build:** `npm run build` OK.

## Checkpoints Etapa B

- [x] Spec aprovada (gate humano)  
- [x] M0–M11  
- [x] Build OK  
- [x] T1–T26  
- [x] `AUDITORIA_FASE6C_*` → **APROVADA**
