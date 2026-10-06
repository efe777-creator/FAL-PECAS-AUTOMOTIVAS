# F9-B Edge — create Mercado Pago payment (sandbox)
# Secrets (Dashboard / CLI — nunca no git):
#   MP_ACCESS_TOKEN   Access Token TEST
#   MP_ENV=test
# Supabase injeta: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
#
# Deploy (quando autorizado):
#   npx supabase functions deploy create-mp-payment --linked
#   npx supabase secrets set MP_ACCESS_TOKEN=... MP_ENV=test --linked
