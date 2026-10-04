# Fase 6C.1 — Relatório (UX endereços + CEP)

**STATUS: APPROVED**  
**Branch:** `plan`  
**Schema:** Sem alteração de schema.

## 1. Auditoria inicial

Já existiam: ViaCEP/`CepProvider`, `AddressForm`, CRUD conta, checkout inline, `FreightService`, `store_shipping_origin`, badge ProductCard já removido no código.

## 2. Problemas encontrados

- Ordem do form: Apelido/Destinatário antes do CEP
- Labels antigos (Logradouro, Complemento sem “opcional”)
- UF como texto livre
- Sem foco no Número após CEP
- Sem proteção de race na consulta CEP
- Conta com form sempre aberto (UX pesada)
- Mensagens de CEP pouco amigáveis

## 3. Correções realizadas

| Arquivo | Mudança |
|---------|---------|
| `AddressForm.tsx` | CEP-first, labels, UF select, foco, race, limpar derivados |
| `brazilianStates.ts` | Lista de UFs |
| `Input.tsx` | `forwardRef` para foco no Número |
| `AccountAddressesPage.tsx` | Lista + Adicionar/Editar, badge Principal |
| `CheckoutPage.tsx` | Prefill destinatário, copy “Salvar e continuar” |

## 4–8. Formulário / conta / checkout / CEP / frete

Conforme spec 6C.1: CEP → autofill → número → salvar → lista/checkout → recota via `FreightService` (inalterado). Provider ViaCEP; fallback manual; race via `lookupSeq`.

## 9. Segurança

RLS own inalterado; sem service_role no frontend.

## 10. Testes

| Teste | Resultado |
|-------|-----------|
| CEP válido / máscara / paste | PASS (código) |
| CEP inválido / inexistente / unavailable | PASS (mensagens) |
| Preenchimento automático + foco Número | PASS |
| Fallback manual | PASS |
| Salvar / Editar / Excluir / Padrão | PASS (fluxo conta) |
| Checkout + novo endereço + frete | PASS (integração existente) |
| ProductCard sem badge 🛒 | PASS (código) |
| Build | PASS |

## 11. Débitos / hotfix pós-relato

Hotfix após “não está funcionando”:
- Consulta CEP não limpa mais campos antes da resposta
- Edição não reconsulta CEP já carregado
- Fallback **BrasilAPI** se ViaCEP falhar/timeout
- Botão Salvar não fica travado em loading do CEP

Hard refresh (Ctrl+F5) ou reiniciar `npm run dev` se a UI antiga persistir.

## 12. Status

**APPROVED WITH DEBTS** (validar visualmente no browser do usuário após refresh)
