import { test, expect } from '@playwright/test'

test.describe('Alerts Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'platform-admin@auraspear.io')
    await page.fill('input[name="password"]', 'Admin@123!Secure')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 })
  })

  test('should navigate to alerts page and show table', async ({ page }) => {
    await page.goto('/alerts')
    await expect(page).toHaveURL(/alerts/)
    // Should show page header and data table
    const table = page.locator('table, [role="table"]')
    await expect(table.first()).toBeVisible({ timeout: 10_000 })
  })

  test('should show alert detail drawer on row click', async ({ page }) => {
    await page.goto('/alerts')
    const tableRow = page.locator('tbody tr, [role="row"]').first()
    await expect(tableRow).toBeVisible({ timeout: 10_000 })
    await tableRow.click()
    // Detail drawer/sheet should appear
    const drawer = page.locator('[role="dialog"], [class*="Sheet"], [class*="Drawer"]')
    await expect(drawer.first()).toBeVisible({ timeout: 5_000 })
  })
})
