import { test, expect } from '@playwright/test';

// Force light mode before each test by navigating, setting localStorage, then reloading
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('bakeryos_theme', 'light'));
  await page.reload();
  await expect(page.getByText('BakeryOS')).toBeVisible();
});

test('shows dark mode toggle button', async ({ page }) => {
  await expect(page.getByRole('button', { name: /dark mode|light mode/i })).toBeVisible();
});

test('toggles from light to dark mode', async ({ page }) => {
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/dark/);

  await page.getByRole('button', { name: 'Dark Mode' }).click();

  await expect(html).toHaveClass(/dark/);
  await expect(page.getByRole('button', { name: 'Light Mode' })).toBeVisible();
});

test('persists dark mode preference in localStorage', async ({ page }) => {
  await page.getByRole('button', { name: 'Dark Mode' }).click();

  const theme = await page.evaluate(() => localStorage.getItem('bakeryos_theme'));
  expect(theme).toBe('dark');
});

test('restores dark mode on reload', async ({ page }) => {
  // Set dark mode via localStorage and reload (avoids addInitScript override issues)
  await page.evaluate(() => localStorage.setItem('bakeryos_theme', 'dark'));
  await page.reload();

  await expect(page.getByText('BakeryOS')).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('toggles back from dark to light mode', async ({ page }) => {
  await page.getByRole('button', { name: 'Dark Mode' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.getByRole('button', { name: 'Light Mode' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});
