import { test, expect } from '@playwright/test'
import { e2eCredentials, loginAsE2EUser } from './helpers/auth'
import { openManualAddForm, selectFirstRealOption } from './helpers/garage'

const hasCreds = Boolean(e2eCredentials())

test.describe('R5 #13 — Múltiplos veículos', () => {
  test.skip(!hasCreds, 'Defina E2E_USER_EMAIL e E2E_USER_PASSWORD para rodar este e2e')

  test('dois cadastros coexistem na lista', async ({ page }) => {
    await loginAsE2EUser(page)

    const nickA = `MultiA ${Date.now().toString(36)}`
    const nickB = `MultiB ${Date.now().toString(36)}`

    for (const nick of [nickA, nickB]) {
      await openManualAddForm(page)
      await selectFirstRealOption(page, 'Montadora')
      await selectFirstRealOption(page, 'Modelo')
      await page
        .locator('div')
        .filter({ has: page.locator('label', { hasText: /^Apelido/ }) })
        .locator('input')
        .fill(nick)
      await page.getByRole('button', { name: 'Salvar na garagem' }).click()
      await expect(page.getByText(nick)).toBeVisible({ timeout: 30_000 })
    }

    await expect(page.getByText(nickA)).toBeVisible()
    await expect(page.getByText(nickB)).toBeVisible()
  })
})
