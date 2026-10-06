# Auditoria baseline Git — encaixe F9-MP 2026-10-06

**Coletado em:** 2026-10-06 (docs MP)  
**Remote:** `origin` → `https://github.com/efe777-creator/FAL-PECAS-AUTOMOTIVAS.git`  
**Opção A / Gate F8.5:** **FECHADOS**  
**F9.0 adapters:** em `main`  
**F9-MP:** auditoria/spec em `plan` — impl STOP

---

## Tips atuais

| Branch | Tip | Nota |
|--------|-----|------|
| `main` / `origin/main` | **`1abea37`** | F8.5 + F9.0 + vitrine |
| `dev` / `origin/dev` | **`a739c9d`** | pacote código alinhado |
| `plan` / `origin/plan` | _(docs encaixe MP)_ | só docs |

`main` contém F8.4 + F8.5 (+P1) + F9.0 (Correios/Frenet/gateway sandbox) + vitrine.

### Feature branches (já ancestral de `main`)

| Branch | Tip | Nota |
|--------|-----|------|
| `feat/f8.4-baseline` | `bba6c47` | não re-mergear |
| `feat/f8.5-list-extra-cost-percent` | `f1fe91c` | não re-mergear |
| `feat/f8.5-p1-list-select-save-order` | `27c53bf` | não re-mergear |
| `feat/f9-a-frete-correios` | `454ce50` | F9.0 — não re-mergear |
| `feat/f9-b-frenet-sandbox` | `be677a2` | F9.0 — não re-mergear |
| `feat/f9-c-payment-gateway-sandbox` | `feb1678` | F9.0 — não re-mergear |
| `feat/vitrine-category-icons` | `69ed277` | não re-mergear |

---

## Migration / gates

| Item | Status |
|------|--------|
| F8.5 prepared + histórico | **aplicado/registrado** |
| PR #1–#4 | **MERGED** |
| F9-MP docs | **em plan** (auditoria + spec + checklist) |
| F9-MP impl | **STOP** até MARCHA |

---

## Conclusão

1. F8.5 **não** está aberto — não reexecutar.  
2. F9 de negócio = **Mercado Pago** (não frete).  
3. F8.6–F8.8 = paralelo; F10 = frete real.  
4. Próximo código: só com MARCHA pós-revisão da auditoria MP.
