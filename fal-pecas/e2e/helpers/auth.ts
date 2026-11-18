import { expect, type Page } from '@playwright/test'

export function e2eCredentials(): { email: string; password: string } | null {
  const email = process.env.E2E_USER_EMAIL?.trim()
  const password = process.env.E2E_USER_PASSWORD?.trim()
  if (!email || !password) return null
  return { email, password }
}

/** Login via UI; requires E2E_USER_EMAIL / E2E_USER_PASSWORD. */
export async function loginAsE2EUser(page: Page): Promise<void> {
  const creds = e2eCredentials()
  if (!creds) {
    throw new Error('E2E_USER_EMAIL / E2E_USER_PASSWORD ausentes')
  }

  await page.goto('/login')
  await page.getByLabel('E-mail').fill(creds.email)
  await page.getByLabel('Senha').fill(creds.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
}
