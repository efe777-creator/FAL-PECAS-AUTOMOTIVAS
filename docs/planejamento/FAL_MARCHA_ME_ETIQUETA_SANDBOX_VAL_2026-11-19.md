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

## Jornada UI operador

Vite `http://localhost:5173` · `VITE_SHIPPING_ME_ENV=sandbox` · staff `efe.comercioltda@gmail.com`.

### Fase 1 — Âncora printed

| Critério | Resultado |
|----------|-----------|
| Pedido | `921d61aa-dc08-4ab6-b288-11812f695cf5` |
| Aba Logística | **PASS** · Situação **Etiqueta impressa** |
| Comprar / Gerar | **PASS** · desabilitados |
| Imprimir | **PASS** · abre sandbox ME (`sandbox.melhorenvio.com.br`) |

### Fase 2 — Ciclo UI fresh (seed → print)

| Passo | Resultado |
|-------|-----------|
| Seed | `STOP_AFTER=seed` · `342e6cb7-3abb-46fd-9e8e-90536cdcd2b6` · `label_state=none` + packing completo |
| Packing 1º paint | **PASS** · “Packing completo” (sem flash 0/1) |
| Cotar | **PASS** · `Cotação de etiqueta · R$ 11,15` |
| Preparar | **PASS** · `No carrinho Melhor Envio` |
| Comprar dialog | **PASS** · copy **ambiente de testes** (não produção) |
| Comprar | **PASS** · `Etiqueta comprada` · protocolo `PUR-202611151316` |
| Gerar | **PASS** · `Etiqueta gerada` · dialog despacho → “Agora não” |
| Imprimir | **PASS** · `Etiqueta impressa` · URL `https://sandbox.melhorenvio.com.br/portal/imprimir/TW0ZyaqKYZK4` |

### Correções UI×Edge nesta marcha

| Sintoma | Correção |
|---------|----------|
| Packing “Nenhum volume” / 0/1 no 1º frame | `OrderPackingPanel` hidrata volumes sync no `useState` inicial (`volumesFromOrderMeta`) |
| Smoke só ciclo completo | `STOP_AFTER=seed\|status\|quote\|prepare\|purchase\|generate` em `scripts/smoke-me-label.mjs` |

### Notas (não bloqueantes)

- Após cada ação ME + `onReload`, a aba volta para **Geral** (operador reabre Logística).
- Print sandbox pode abrir `/404` intermediário antes do portal `/imprimir/{id}` — URL final OK.

### Aceite

| ID | Critério | Status |
|----|----------|--------|
| C1 | Âncora printed + reimprimível | **PASS** |
| C2 | Pedido novo Cotar→…→Imprimir sandbox | **PASS** · `342e6cb7-…` |
| C3 | Dialog compra coerente sandbox | **PASS** |
| C4 | Bugs desta marcha corrigidos/doc | **PASS** |
| C5 | Sem deploy produção | **PASS** |

## Segurança

Token ME apareceu em log de terminal local — **considerar regenerar** no painel ME sandbox se o log for compartilhado. Não commitado no git.

## Próximo (onda 2)

Registry fino `packing` / `ownShip` / `meFreight` no surface (`wave=2`) — lógica ME já validada no slot.

**Assinatura:** MARCHA ME etiqueta sandbox **UI+Edge PASS** · 2026-11-19.
