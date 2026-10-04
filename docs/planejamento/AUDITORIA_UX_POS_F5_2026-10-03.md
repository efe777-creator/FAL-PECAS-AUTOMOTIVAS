# Auditoria UX pós-F5 — 2026-10-03

**STATUS: APROVADA (com correções aplicadas)**

**Escopo:** smoke funcional F3–F5 + gaps UX mínimos. Sem checkout. CPF continua opcional até a F6 (obrigatório só ao finalizar compra).

## Smoke (confirmado)

| Área | Resultado |
|------|-----------|
| Home / CTA veículo | OK — CTA NavBar aponta para `/veiculo` |
| Catálogo + filtros F4 | OK — busca, categoria, veículo, chips |
| Meus veículos no catálogo | OK — QuickPick discreto junto aos filtros |
| PDP favorito + breadcrumb + voltar mobile | OK |
| Conta (perfil/endereços/veículos/favoritos/pedidos) | OK — CPF opcional no perfil |
| Footer links reais | OK (Privacidade/Termos = “em breve”) |
| Mobile bottom nav + safe area / padding main | OK |
| Staff: Painel Admin; cliente: sem admin | OK (inalterado F4B/F5) |
| Build | OK |

## Correções aplicadas nesta auditoria

1. **Catálogo:** `SavedVehiclesQuickPick` abaixo dos filtros de veículo; link conta “Ver peças” inclui `version`.
2. **PDP:** botão favoritar (mesmo contrato do card); breadcrumb com links Início/categoria; seta Voltar no mobile.
3. **NavBar:** CTA → `/veiculo`; categorias em linha com scroll horizontal (`flex-nowrap`).
4. **MainLayout:** `padding-bottom` no `main` para não ficar atrás do `MobileNav`.

## Explicitamente fora / F6

- Checkout completo e CPF obrigatório na finalização
- Páginas Privacidade/Termos
- Faceted search / redesign header-footer
