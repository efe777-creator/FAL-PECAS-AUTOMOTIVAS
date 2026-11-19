# MARCHA VAL — Etiqueta ME sandbox (jornada operador / Edge)

Data: 2026-11-19 · branch **`dev`**  
Runtime: `wtbpwuiayednvlhvuhbh` · **sem deploy Netlify / sem merge main**

## Objetivo

Confirmar emissão de etiqueta Melhor Envio em **sandbox** (quote → prepare → purchase → generate → print) para ingressar na onda 2 com base segura.

## Ops executado

| Item | Resultado |
|------|-----------|
| `MELHOR_ENVIO_TOKEN` (sandbox) | **SET** (Supabase secrets) |
| `MELHOR_ENVIO_USER_AGENT` | **SET** — `FAL Pecas Automotivas (efe.comercioltda@gmail.com)` |
| `MELHOR_ENVIO_API_BASE` | **SET** — `https://sandbox.melhorenvio.com.br` |
| Deploy Edge `melhorenvio-label` | **PASS** |
| Front local `VITE_SHIPPING_ME_ENV` | **sandbox** (`.env.local`, não commitado) |

## Smoke `scripts/smoke-me-label.mjs`

| Passo | Resultado |
|-------|-----------|
| Staff smoke | `efe.comercioltda@gmail.com` (`teste@gmail.com` = **não staff**) |
| Seed | pagamento `approved` + packing alocado |
| Pedido âncora | `921d61aa-dc08-4ab6-b288-11812f695cf5` · `SMOKE-ME-LABEL-20261119` |
| `status` | HTTP 200 · `sandbox:true` · `dryRun:false` |
| `quote` | **PASS** · `label_state=quoted` |
| `prepare` | **PASS** · `label_state=cart` |
| `purchase` | **PASS** · `label_state=purchased` |
| `generate` | **PASS** · `label_state=generated` |
| `print` | **PASS** · `label_state=printed` · URL sandbox ME |

**Veredito Edge/sandbox:** **PASS** ciclo completo (HTTP real sandbox, não dry-run).

## Jornada UI operador (checklist eFe)

1. Reiniciar Vite (`.env.local` com `VITE_SHIPPING_ME_ENV=sandbox`).
2. Login staff → `/admin/pedidos/{uuid}` ou hub → aba **Logística**.
3. Pedido ME em `pronto_para_envio` + packing completo + pagamento aprovado.
4. Cotar → Preparar → Comprar (confirmar “testes”) → Gerar → Imprimir.
5. **Não** `ship_order` até postagem física.

Pedido smoke acima serve para abrir na UI e conferir `label_state=printed`.

## Segurança

Token ME apareceu em log de terminal local — **considerar regenerar** no painel ME sandbox se o log for compartilhado. Não commitado no git.

## Próximo (onda 2)

Registry fino `packing` / `ownShip` / `meFreight` no surface (`wave=2`) — lógica ME já validada no slot.

**Assinatura:** MARCHA ME etiqueta sandbox PASS · 2026-11-19.
