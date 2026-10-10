# MARCHA — Admin Aplicações (gestão global)

**Data:** 2026-10-10  
**Estado:** VALIDADO (código + import unit + DB; smoke staff residual)  
**Rota:** `/admin/aplicacoes`  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## Escopo

Tela fora do cadastro individual do produto para controlar aplicações (`product_vehicle_compatibility`), inclusive as trazidas pela importação (motorização / engine).

| Ação | Status |
|------|--------|
| Listar + filtrar (SKU, montadora, modelo, motor, versão) | OK |
| Criar (SKU + cascata + período; motor/versão vazios = todas) | OK |
| Editar período | OK |
| Excluir uma / seleção | OK |
| Link importação ↔ gestão | OK |
| Link produto → gestão (`?productId=`) | OK |
| Nav admin “Aplicações” | OK |

---

## Arquivos

- `fal-pecas/src/services/admin/adminApplicationService.ts`
- `fal-pecas/src/pages/admin/products/AdminApplicationsPage.tsx`
- Import: `applicationImportCore.ts` + migration `apps_import_motorizacao`
- Rota + nav: `router.tsx`, `AdminLayout.tsx`
- Atalhos: produto, veículos, import aplicações

---

## Evidências

| Tipo | Resultado |
|------|-----------|
| Unit import apps (+ motorização) | **28/28 PASS** (`applicationImportCore.test`) |
| DB PVC | **730** apps · **100** produtos · **268** versões |
| Amostra | SKUs `1307B`/`1308B` Fiat Palio com motor/versão/anos |
| Smoke staff UI | Residual (login admin) |

---

## Smoke residual (humano staff)

```text
1. /admin/aplicacoes — lista com filtros
2. Abrir com ?productId= de um produto com apps
3. Editar período / excluir uma linha de teste
4. Criar manual: SKU existente + motor “Todas”
5. Conferir link Importar aplicações ↔ gestão
```

---

## Fora de escopo

- Smoke MP / D-FRETE / E2E pago  
- Bloco F RLS  
- Auto-criar produto na import de apps (proibido)
