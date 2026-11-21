# melhorenvio-reverse

Logística reversa Melhor Envio (PAC/SEDEX) — Fase 3 pós-venda.

## Actions

- `status` — elegibilidade + código já gerado
- `generate` — cotar min(PAC,SEDEX) → cart/reverse → checkout → generate → `attach_me_return_code`

## Auth

JWT do cliente (dono do pedido) ou staff.

## Body

```json
{
  "action": "generate",
  "orderId": "uuid",
  "occurrenceId": "uuid",
  "serviceOverride": "pac|sedex"
}
```

## Secrets

Mesmos de `melhorenvio-label`: `MELHOR_ENVIO_TOKEN`, `MELHOR_ENVIO_USER_AGENT`, `MELHOR_ENVIO_API_BASE`.

Sandbox: generate de código pode falhar — Edge devolve código sintético `SBX-REV-*` só em sandbox.
