# MARCHA — Diagnóstico cartão mobile (Secure Fields) — 2026-11-13

## Escopo

Fase 0 da OT Frete e cartões FAL. Provar causa técnica do bloqueio de digitação/autofill no celular **antes** de novo CSS cosmético.

## Evidência (código + docs anteriores)

| Hipótese | Resultado | Evidência |
| --- | --- | --- |
| Payment Brick height 0 / `onReady` nunca | Mitigado (já migrado) | Core Methods em `MercadoPagoCardBrickPanel`; docs CORE_METHODS 2026-11-12 |
| StrictMode double-mount | Mitigado | `main.tsx` StrictMode off |
| Shell CSS clipa iframe PCI | **CONFIRMADA — causa raiz atual** | `fieldShellClass`: `h-12 overflow-hidden` + `[&_iframe]:!h-12` — hit-area/caret cortados no teclado virtual |
| Remount `mountKey` pós-reject | **CONFIRMADA — agrava** | `remountFields()` chamado após reject → destrói iframes mid-session |
| Máscara local no PAN | Descartada | Sem máscara nos Secure Fields |
| Autofill iOS nos iframes PCI | Limitação do provedor | Só `autoComplete="cc-name"` no input local; PAN/validade/CVV em `secure-fields.mercadopago.com` |

## Causa raiz (única para digitação)

**Clip + altura rígida do container dos Secure Fields** (`overflow-hidden` + iframe forçado a 48px) impede digitação confiável no mobile. Remount automático após rejeição agrava perda de foco/conteúdo.

## Fix autorizado (Fase 1)

1. Remover `overflow-hidden` e altura forçada do iframe; usar `min-h` + shell sem clip.
2. Não remount automático em reject — só botão “Tentar novamente”.
3. Manter Core Methods; zero máscara PCI; zero persistência de PAN/CVV.

## Critério de saída Fase 0

PASS — hipótese única confirmada por evidência de código + histórico MARCHA (não “parece CSS”).
