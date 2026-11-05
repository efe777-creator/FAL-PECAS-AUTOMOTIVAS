# Auditoria completa — Frete Próprio FAL

**Data:** 2026-11-05  
**Projeto:** wtbpwuiayednvlhvuhbh  
**Política:** D-FRETE **B** (sandbox/homolog)  
**Fórmula alvo:** `frete = max(km_ida × R$/km, tarifa_mínima) + adicional`  
**VALs relacionados:** [FAL_MARCHA_FRETE_PROPRIO_V2_VAL](./FAL_MARCHA_FRETE_PROPRIO_V2_VAL_2026-11-05.md) · [FAL_MARCHA_FRETE_PROPRIO_UX_VAL](./FAL_MARCHA_FRETE_PROPRIO_UX_VAL_2026-11-05.md)

---

## 1. Escopo feito (código + ops)

| Item | Estado |
|------|--------|
| Schema v2 (veículos, tarifas, POL produto, cache rota, audit, manual) | Aplicado wtbp |
| UX schema (`icon`, `max_distance_km`, `adicional`) `20261105130000` | Aplicado wtbp |
| `place_order` + opção `ownq:<quote>:<vehicle>` | Aplicado wtbp |
| Motores TS: POL / seleção veículo / preço (+ adicional) | Código + testes |
| Edge `quote-own-delivery` (Google Routes ida) | Deployed |
| Admin `/admin/logistica/frete-proprio` (Gerais · Veículos · Tarifas · Produtos · Manual · Histórico) | UX clarificada (sem ID `own:` na cara) |
| Form produto: POL / porte / veículo mín. / frete FAL (mesma tabela `products`) | Wired |
| Checkout passa número/rua; mock/ME providers chamam `resolveOwnQuoteOptions` | Wired |
| Secret `GOOGLE_MAPS_API_KEY` | Setado por eFe |
| Origem loja | Guarulhos · CEP 07124543 |
| POL published | 100/100 com `pol_unit=1` (provisório homolog) |

### Tarifas de homologação usadas no smoke (não comercial)

| Veículo | Mínima | R$/km | Adicional | Ativa |
|---------|--------|-------|-----------|-------|
| Motocicleta | R$ 15,00 | R$ 2,50 | R$ 0 | sim |
| Carro | R$ 25,00 | R$ 3,50 | R$ 5,00 | sim |

Durante o smoke: `enabled=true` · `pricing_mode=distance_vehicle` · `max_distance_km=80`.  
**Pós-smoke (D-FRETE B):** `enabled=false` · `pricing_mode=flat` (tarifas homolog **permanecem** no banco para o próximo teste).

---

## 2. Matriz testado

| Camada | Resultado | Evidência |
|--------|-----------|-----------|
| Schema / settings pós-homolog | **PASS** | Tarifas ativas com valores acima; cutover ligado depois revertido |
| `vitest` `src/services/shipping/own` | **PASS** | 11/11 |
| `tsc --noEmit` | **PASS** | exit 0 |
| Edge auth + `missing_number` | **PASS** | `status=missing_number` com número vazio |
| Edge cobertura CEP | **PASS** | CEP 80010000 → `out_of_coverage` |
| Edge path cotação com endereço SP | **PASS** (MARCHA #6) | `status=priced` · km 28.568 · moto · R$ 71,42 · `ownq:4df8200f-…:motorcycle` |
| Google Routes API | **PASS** | Key + Routes API + restrições OK após ajustes eFe |
| Persistência `shipping_quotes` own | **PASS** | Quote `4df8200f-fceb-4b73-aae2-910c98a50065` |
| Option `ownq:` gerada | **PASS** | Pronta para `place_order` |
| `place_order` ownq E2E | **PASS** (após fix) | order `5bc43c25-…` · ship 71.42 · provider own · quote consumida |
| Bug `v_ship` no CASE | **FIX** | Migration `20261105140000_…` aplicada wtbp |
| Checkout UI browser | **NÃO EXECUTADO** | API/RPC cobre o caminho crítico |
| Admin UX títulos/menus | **PASS (código)** | Sem campo ID na tabela fixa; detalhes técnicos opcionais |
| Regressão flat no código | **PASS (inspeção)** | `resolveOwnQuoteOptions` ainda serve `rates` quando `flat` |
| Regressão `meq:` live | **NÃO EXECUTADO** | Fora deste ciclo (D-FRETE B / ME) |

---

## 3. Funcionando

- Cadastro admin de veículos (nome, ícone, POL, km máx, incluir/excluir).
- Cadastro admin de tarifas (mínima, R$/km, adicional).
- POL do produto na Logística e no form — mesma coluna `products.pol_unit`.
- Pipeline Edge até o ponto do Google: auth, CEP, POL, escolha de veículo/tarifa.
- Respostas honestas: `missing_number`, `out_of_coverage`, `routing_error`.
- Fórmula unitária com adicional.
- Reversão segura pós-teste (`enabled=false`).

## 4. Não funciona / bloqueios

| Problema | Causa | Impacto |
|----------|-------|---------|
| ~~Cotação priced~~ | **Resolvido** MARCHA #6 | — |
| Cutover loja | Deixado **desligado** de propósito (B) | Loja não oferece frete próprio distance agora |
| ~~place_order ownq~~ | **Resolvido** + fix `v_ship_provider` | — |

Fórmula conferida: `max(28.568 × 2,50, 15) + 0 = 71,42`. Pedido smoke total 237.98 (produto + frete).

---

## 5. Ajustes necessários

1. **Google Cloud** — validar/criar key válida; habilitar **Routes API**; billing ativo; restrições (só Routes + IP/referrer se aplicável). Re-setar:
   `npx supabase secrets set GOOGLE_MAPS_API_KEY=… --project-ref wtbpwuiayednvlhvuhbh`
2. **Rotacionar key** — a chave anterior circulou em terminal/chat.
3. **Tarifas comerciais** — substituir valores homolog quando for cutover real.
4. **Follow-ups código** — insert em `own_manual_reviews` no path `manual_review`; bulk POL preserve; smoke visual admin no browser.
5. **CEP cobertura** — origem Guarulhos fora da faixa capital `01000000–05999999` (ok para origem; destino smoke usou Paulista dentro da faixa).

---

## 6. Pendências de teste

| Teste | Dependência |
|-------|-------------|
| Edge `status=priced` + `distanceKm` + `amount` + `ownq:` | Key Routes válida |
| Checkout UI mostra opção FAL selecionável | `priced` |
| `place_order` com `ownq:` | Cotação persistida + pedido draft |
| Pedido pago + fluxo operacional admin | MP smoke separado |
| Regressão Melhor Envio `meq:` | MARCHA ME / live ≠ B |
| Push/PR GitHub | Credencial write (403 conhecido) |

---

## 7. STOP / próximo passo

**CUTOVER (2026-11-05):** `enabled=true` · `distance_vehicle` · tarifas homolog até eFe editar no menu **Tarifas**. Smoke `priced` revalidado PASS.

**Assinatura:** Cutover frete próprio ON 2026-11-05.
