# Relatório marcha — Plano mestre backlog 2026-10-07

## Entregue nesta marcha

| Item | Artefato |
|------|----------|
| Etapa 0 | `AUDITORIA_COPY_UX_2026-10-07.md`, `AUDITORIA_BASELINE_BACKLOG_2026-10-07.md` |
| Import A | `AUDITORIA_IMPORT_INTELIGENTE_FASE_A_2026-10-07.md` |
| Spec B | `ESPECIFICACAO_IMPORTACAO_INTELIGENTE_APLICACOES_2026-10-07.md` |
| Plano | `PLANO_MESTRE_BACKLOG_LOJA_OPS_2026-10-07.md` |
| Motor C | `applicationImportCore.ts` + testes + `analyzeApplicationMappedRows` |
| Schema PVC | migration `20261007120000_import_inteligente_pvc_year_range.sql` + RPC `search_products` com intervalo |
| Staging UI | `AdminApplicationsImportPage` + contrato `catalog_applications` (prévia; apply RPC na próxima) |
| Bloco A | Home vitrine, card sem fabricante, PDP, ScrollToTop, drawer mobile completo |
| Bloco B | `PageShell` + scroll global + shells admin/loja |
| Bloco C | Operadores: lista staff, último acesso, desativar soft (`admin_deactivate_operator`) |
| Bloco D | Cadastro CPF + e-mail pendente + encerrar conta (`request_account_deletion`) |
| Bloco E | WhatsApp produto/pedido (`VITE_WHATSAPP_PHONE`) |
| Bloco F/G | STOP docs (`STOP_BLOCO_F_*`, `STOP_BLOCO_G_*`) |

## Migrations aplicadas no remoto

- `import_inteligente_pvc_year_range` (colunas PVC)
- `search_products_pvc_year_range_filter_v2`
- `bloco_cd_operators_account`

## Pendente (próximas MARCHAs)

- Apply RPC transacional de aplicações (confirmação no catálogo)
- Reset de senha operador / convite Auth
- OTP telefone
- Permissões granulares (F) — ver STOP
- Smoke live MP (G) — ver STOP
