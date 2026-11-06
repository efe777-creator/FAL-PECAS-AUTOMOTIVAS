# VAL — O1-E / O0-C: Configurações de envio + copy residual

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Plano:** ME-C7 (leve) · O0-C jargão · Onda 3 rótulo campanhas

## Entrega

| Peça | Mudança |
|------|---------|
| `AdminShippingSettingsPage` | Regras atuais + atalhos; hub deixa de ser “Em breve” |
| Router | `/admin/logistica/configuracoes` |
| `HomeBannerCarousel` | sr-only **Campanhas** (não “Destaques”) |
| `AuthNotConfiguredError` | mensagem humana sem `VITE_` |
| Labels Correios/Frenet/ME | sem “(sandbox)” na UI |

## Critérios

- [x] Hub Logística → Configurações abre página real
- [x] Sem “sandbox” nos labels de opção de frete stub
- [x] `tsc` + testes shipping tocados PASS

## Gate humano

Toggles persistidos de bloqueio / ME-C3 etiqueta / D-FRETE C — fora desta fatia.
