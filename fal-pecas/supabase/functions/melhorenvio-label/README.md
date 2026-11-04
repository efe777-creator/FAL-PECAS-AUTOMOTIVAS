# Edge `melhorenvio-label`

Máquina idempotente Sandbox: `quote` → `prepare` → `purchase` → `generate` → `print` (+ `tracking` / `status`).

## Secrets

- `MELHOR_ENVIO_TOKEN` — Bearer sandbox (nunca VITE_)
- `MELHOR_ENVIO_USER_AGENT` — obrigatório pela API ME

Sem token: **dry_run** atualiza `shipments.metadata.me` localmente para testar UI (não é postagem real).

## Regras

- Staff only (`is_staff`)
- Pedido deve estar `pronto_para_envio` / `preparando_envio`
- `purchase` exige `confirm: true`
- Divergência frete cobrado × etiqueta → 409, sem cobrar cliente
- **Nunca** chama `ship_order` / `deliver_order`

## Deploy (só quando autorizado)

```bash
npx supabase functions deploy melhorenvio-label --linked
```
