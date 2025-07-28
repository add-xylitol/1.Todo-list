import { test, expect } from '@playwright/test';

test.describe('TodoList App UI', () => {
  test('should display login form on desktop', async ({ page }) => {
    await page.goto('http://localhost:8000');
    await expect(page.locator('#auth-section')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:text("Register")')).toBeVisible();
    await expect(page.locator('button:text("Login")')).toBeVisible();
  });

  test('should display responsive login form on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:8000');
    await expect(page.locator('#auth-section')).toBeVisible();
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    const inputWidth = await emailInput.evaluate(el => el.offsetWidth);
    const parentWidth = await emailInput.evaluate(el => el.parentElement.offsetWidth);
    expect(inputWidth).toBe(parentWidth); // Check if input takes full parent width
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:text("Register")')).toBeVisible();
    await expect(page.locator('button:text("Login")')).toBeVisible();
  });
});