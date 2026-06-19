import { test, expect } from '@playwright/test'

test.describe('Cases Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'platform-admin@auraspear.io')
    await page.fill('input[name="password"]', 'Admin@123!Secure')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 })
  })

  test('should load cases list page', async ({ page }) => {
    await page.goto('/cases')
    await expect(page).toHaveURL(/cases/)
    const table = page.locator('table, [role="table"]')
    await expect(table.first()).toBeVisible({ timeout: 10_000 })
  })

  test('should navigate to case detail with AI findings panel', async ({ page }) => {
    await page.goto('/cases')
    const firstRow = page.locator('tbody tr, [role="row"]').first()
    await expect(firstRow).toBeVisible({ timeout: 10_000 })
    await firstRow.click()
    // Should navigate to case detail
    await expect(page).toHaveURL(/cases\/[a-f0-9-]+/, { timeout: 5_000 })
    // AI Findings panel should be present
    const findingsSection = page.locator('text=/AI Findings|findings/i')
    await expect(findingsSection.first()).toBeVisible({ timeout: 10_000 })
  })
})
