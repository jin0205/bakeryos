import { test, expect } from './fixtures';

// Force light mode before each test by navigating, setting localStorage, then reloading
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('bakeryos_theme', 'light'));
  await page.reload();
  await expect(page.getByText('BakeryOS')).toBeVisible();
});

test('shows dark mode toggle button', async ({ page }) => {
  await expect(page.getByRole('button', { name: /amoled mode|light mode/i })).toBeVisible();
});

test('toggles from light to AMOLED mode', async ({ page }) => {
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/theme-amoled/);

  await page.getByRole('button', { name: 'AMOLED Mode' }).click();

  await expect(html).toHaveClass(/theme-amoled/);
  await expect(page.getByRole('button', { name: 'Light Mode' })).toBeVisible();
});

test('persists AMOLED preference in localStorage', async ({ page }) => {
  await page.getByRole('button', { name: 'AMOLED Mode' }).click();

  const theme = await page.evaluate(() => localStorage.getItem('bakeryos_theme'));
  expect(theme).toBe('amoled');
});

test('restores AMOLED mode on reload', async ({ page }) => {
  // Set AMOLED mode via localStorage and reload (avoids addInitScript override issues)
  await page.evaluate(() => localStorage.setItem('bakeryos_theme', 'amoled'));
  await page.reload();

  await expect(page.getByText('BakeryOS')).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/theme-amoled/);
});

test('toggles back from AMOLED to light mode', async ({ page }) => {
  await page.getByRole('button', { name: 'AMOLED Mode' }).click();
  await expect(page.locator('html')).toHaveClass(/theme-amoled/);

  await page.getByRole('button', { name: 'Light Mode' }).click();
  await expect(page.locator('html')).not.toHaveClass(/theme-amoled/);
});
