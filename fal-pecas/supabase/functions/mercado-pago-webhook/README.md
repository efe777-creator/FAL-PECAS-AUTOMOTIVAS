# F9-C — mercado-pago-webhook
#
# Secrets (Supabase):
#   MP_ACCESS_TOKEN
#   MP_WEBHOOK_SECRET
#   MP_ENV=test
#
# Deploy:
#   npx supabase functions deploy mercado-pago-webhook --linked
#   npx supabase secrets set MP_WEBHOOK_SECRET=... --linked
#
# URL webhook (DevPanel MP):
#   https://<project-ref>.supabase.co/functions/v1/mercado-pago-webhook
