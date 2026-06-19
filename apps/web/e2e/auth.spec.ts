import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login/)
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'platform-admin@auraspear.io')
    await page.fill('input[name="password"]', 'Admin@123!Secure')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 })
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'invalid@test.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(
      page.locator('[role="alert"], .text-destructive, [data-sonner-toast]')
    ).toBeVisible({
      timeout: 5_000,
    })
  })
})
