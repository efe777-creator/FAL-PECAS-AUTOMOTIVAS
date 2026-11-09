# VAL — Verificação testes comercial eFe (MP/ME produção)

**Data:** 2026-11-09 · ~15h50  
**Auth:** eFe — `FAÇA A VERIFICAÇÃO TESTES`  
**URL:** https://fal-pecas-automotivas-efe.netlify.app  
**Projeto Supabase:** `wtbpwuiayednvlhvuhbh`

---

## Config confirmada (prefixos)

| Camada | Chave | Valor observado |
|--------|-------|-----------------|
| Netlify eFe | `VITE_MP_ENV` | `production` |
| Netlify eFe | `VITE_MP_PUBLIC_KEY` | `APP_USR-…` (len 44) |
| Netlify eFe | `VITE_SHIPPING_ME_ENV` | `production` |
| Edge secrets | `MP_ACCESS_TOKEN` / `MP_ENV` / `MELHOR_ENVIO_TOKEN` / `MELHOR_ENVIO_API_BASE` | Presentes (hashes; atualizados ~18:40Z) |
| Edge `quote-shipping` | modo | **`live`** · provider `melhorenvio` · options≥2 |

---

## Unit / Vitest

| Suite | Resultado |
|-------|-----------|
| `npm test -- --run` (fal-pecas) | **PASS** — 85 files · **415** tests |

---

## Smoke eFe (agente)

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Carrinho guest/logado · CEP `01310-100` + nº `1000` · cotar frete | **PASS** — SEDEX R$ 15,21 · Jadlog R$ 15,79 · Entrega FAL R$ 73,56 |
| 2 | Edge quote anon `mode=live` | **PASS** |
| 3 | Cadastro `@gmail.com` → checkout | **PASS** — `fal.verif.mw9m5ate@gmail.com` |
| 4 | Endereço ViaCEP Av. Paulista / SP | **PASS** |
| 5 | Entrega SEDEX no checkout | **PASS** |
| 6 | Método Pix → **Gerar cobrança Pix** (MP produção) | **PASS** |
| 7 | QR / copia-e-cola + status pendente | **PASS** |

### Evidência Pix comercial

- **Pedido:** `4a1e1249-34c8-45e8-b1b4-6b56b8912206`
- **Valor:** R$ 63,35 (produto R$ 48,14 + SEDEX R$ 15,21)
- **UI:** Pix — aguardando confirmação · status pendente · carrinho 0
- **Link:** `/conta/pedidos/4a1e1249-34c8-45e8-b1b4-6b56b8912206`

---

## Ainda humano / ops

| Item | Status |
|------|--------|
| Pagar Pix real e validar webhook → aprovado | Pendente |
| Fluxo cartão Brick + troca Pix↔cartão | Pendente |
| Admin pagamentos / Métodos→MP | Pendente (staff) |
| Expedição etiqueta ME | Pendente |
| Fernando prod | Bloqueado (crédito) |

---

**Assinatura:** VAL verificação comercial eFe PASS (vitest 415 · frete live · Pix create produção) · webhook approve ainda humano · 2026-11-09.
