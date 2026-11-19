/**
 * Wire Melhor Envio → API produção (sem purchase).
 * Uso:
 *   $env:MELHOR_ENVIO_TOKEN='<token prod>'
 *   node scripts/wire-me-live-secrets.mjs
 *
 * Opcional: MELHOR_ENVIO_USER_AGENT (default FAL Pecas…)
 * Depois: reiniciar Vite com VITE_SHIPPING_ME_ENV=live
 */
import { execSync } from 'node:child_process'

const PROJECT_REF = 'wtbpwuiayednvlhvuhbh'
const API_BASE = 'https://melhorenvio.com.br'
const USER_AGENT =
  process.env.MELHOR_ENVIO_USER_AGENT?.trim() ||
  'FAL Pecas Automotivas (efe.comercioltda@gmail.com)'
const TOKEN = process.env.MELHOR_ENVIO_TOKEN?.trim()

if (!TOKEN) {
  console.error(
    JSON.stringify({
      ok: false,
      error: 'missing_MELHOR_ENVIO_TOKEN',
      hint: 'Defina $env:MELHOR_ENVIO_TOKEN com o token de produção ME antes de rodar.',
    }),
  )
  process.exit(1)
}

function sh(cmd) {
  execSync(cmd, { stdio: 'inherit', shell: true })
}

console.log(JSON.stringify({ step: 'secrets', apiBase: API_BASE, userAgent: USER_AGENT }))
sh(
  `npx supabase secrets set --project-ref ${PROJECT_REF} MELHOR_ENVIO_API_BASE=${API_BASE} MELHOR_ENVIO_USER_AGENT="${USER_AGENT}" MELHOR_ENVIO_TOKEN="${TOKEN}"`,
)

console.log(JSON.stringify({ step: 'deploy', functions: ['quote-shipping', 'melhorenvio-label'] }))
sh(`npx supabase functions deploy quote-shipping --project-ref ${PROJECT_REF} --use-api --yes`)
sh(`npx supabase functions deploy melhorenvio-label --project-ref ${PROJECT_REF} --use-api --yes`)

console.log(
  JSON.stringify({
    step: 'done',
    next: [
      'VITE_SHIPPING_ME_ENV=live (ou production) em .env.local e reiniciar Vite',
      'Smoke: STOP_AFTER=prepare (purchase deve ser pulado em live)',
      'NÃO comprar etiqueta nesta marcha',
    ],
  }),
)
