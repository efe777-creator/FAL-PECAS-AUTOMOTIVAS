import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import '@/styles/index.css'

// Sem StrictMode: Mercado Pago Card Brick / Secure Fields quebra com
// double-mount (Container not found → fields_setup_failed).
createRoot(document.getElementById('root')!).render(<App />)
