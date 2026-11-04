# Edge `melhorenvio-webhook` (stub)

- Valida `X-ME-Signature` (HMAC-SHA256) com `MELHOR_ENVIO_WEBHOOK_SECRET`
- Registra em `melhorenvio_webhook_events` (após migration aprovada)
- **Não** avança pedido para enviado/entregue

```bash
npx supabase functions deploy melhorenvio-webhook --linked
```
