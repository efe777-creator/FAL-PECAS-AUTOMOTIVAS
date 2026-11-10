import { createClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PROJECT_REF = 'wtbpwuiayednvlhvuhbh'
const URL = `https://${PROJECT_REF}.supabase.co`
const EMAIL = process.env.SMOKE_STAFF_EMAIL || 'teste@gmail.com'
const REDIRECT =
  process.env.SMOKE_REDIRECT ||
  'https://fal-pecas-automotivas-efe.netlify.app/admin/pedidos'

const raw = execSync(`npx supabase projects api-keys --remote=${PROJECT_REF} -o json`, {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
})
const keys = JSON.parse(raw.slice(raw.indexOf('[')))
const service = keys.find((k) => k.name === 'service_role')?.api_key
if (!service) throw new Error('service_role missing')

const admin = createClient(URL, service, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const { data, error } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: EMAIL,
  options: { redirectTo: REDIRECT },
})
if (error) throw error
const link = data.properties?.action_link
if (!link) throw new Error('no action_link')
const out = join(tmpdir(), 'fal-admin-magic.txt')
writeFileSync(out, link, 'utf8')
console.log(JSON.stringify({ ok: true, email: EMAIL, out }))
