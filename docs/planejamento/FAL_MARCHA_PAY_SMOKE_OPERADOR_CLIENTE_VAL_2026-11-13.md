# MARCHA — Smoke real PAY (operador + cliente)

**Data:** 2026-11-13  
**Ambiente smoke:** `localhost:5173` + Supabase prod `wtbpwuiayednvlhvuhbh`  
**Deploy:** **não** nesta marcha — só commit/push; deploy sob autorização explícita do eFe.

## Regra de deploy (travada)

- Correções do dia: **commit + push**.
- Deploy Netlify/Edge: **somente** ao fechar implantação do dia **ou** quando o eFe autorizar (ex.: garantia de pagamento em produção).
- Não redeployar a cada ajuste.

## Config DB (fonte comercial)

| Campo | Valor live |
|-------|------------|
| card_enabled | true |
| pix_enabled | true |
| installments_enabled | true |
| max_installments | 3 |
| interest_free_max | 3 |
| allow_interest_installments | false |
| min_installment_amount | 20 |
| enabled / show_on_cards / show_on_pdp | true |

## Smoke operador

| ID | Caso | Resultado |
|----|------|-----------|
| OP-01 | Home → aba Pagamento carrega controles comerciais | **PASS** — cartão/Pix/parcelas/max/sem juros/min |
| OP-02 | Prévia R$ 199,90 | **PASS** — `em até 3x de R$ 66,63 sem juros` |
| OP-03 | Admin → Pagamentos → Métodos | **PASS** — Pix/cartão “Ativo para o cliente” · integração + comercial ON |
| OP-04 | Texto ajuda “só apresentação” | **FALHA→fix** — copy desatualizada (corrigida no código) |
| OP-05 | Deep-link `?tab=payment` | **FALHA→FIX** — não abria aba (corrigido) |

## Smoke cliente

| ID | Caso | Resultado |
|----|------|-----------|
| CL-01 | PDP Formas de pagamento | **PASS** — Cartão Ativo + Pix Ativo |
| CL-02 | PDP R$ 31,97 (abaixo de 2× min R$20) | **PASS** — “À vista no cartão” (política min parcela) |
| CL-03 | Cards relacionados com preço maior | **PASS** — “em até Nx … sem juros” coerente com max 3 + min 20 |
| CL-04 | Cobrança cartão approved E2E | **PENDENTE** — requer cartão real / homologação humana (checklist PAY) |

## Correções nesta marcha (sem deploy)

1. Copy Home: Pagamento = controle comercial (não “só apresentação”).
2. Aba Pagamento via `?tab=payment` + sync na troca de aba.

## Aceite

| Critério | Resultado |
|----------|-----------|
| Operador controla e vê config persistida | PASS |
| Cliente vê meios conforme config | PASS |
| Parcelas anunciadas respeitam min/max | PASS |
| Deploy sob autorização | PASS (não deployado) |

**Assinatura:** MARCHA smoke PAY operador/cliente 2026-11-13.
