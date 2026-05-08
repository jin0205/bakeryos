import { test, expect } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('shows BakeryOS branding in sidebar', async ({ page }) => {
  await expect(page.getByText('BakeryOS')).toBeVisible();
  await expect(page.getByText('Production Intelligence Platform')).toBeVisible();
});

test('renders all main nav items', async ({ page }) => {
  const sidebar = page.locator('aside');
  await expect(sidebar.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
  await expect(sidebar.getByRole('button', { name: 'Formula Library' })).toBeVisible();
  await expect(sidebar.getByRole('button', { name: 'Production', exact: true })).toBeVisible();
  await expect(sidebar.getByRole('button', { name: 'Inventory', exact: true })).toBeVisible();
  await expect(sidebar.getByRole('button', { name: 'Cost & Margin' })).toBeVisible();
  await expect(sidebar.getByRole('button', { name: 'R&D Lab' })).toBeVisible();
  await expect(sidebar.getByRole('button', { name: 'Sales Tracking' })).toBeVisible();
});

test('Home tab is active by default', async ({ page }) => {
  const homeBtn = page.locator('aside').getByRole('button', { name: 'Home', exact: true });
  await expect(homeBtn).toHaveClass(/text-amber-700/);
  await expect(page.getByRole('heading', { name: 'Production Overview' })).toBeVisible();
});

test('navigates to Inventory tab', async ({ page }) => {
  await page.locator('aside').getByRole('button', { name: 'Inventory', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ingredient Stock' })).toBeVisible();
});

test('navigates to Cost & Margin tab', async ({ page }) => {
  await page.locator('aside').getByRole('button', { name: 'Cost & Margin' }).click();
  await expect(page.getByRole('heading', { name: /cost/i })).toBeVisible();
});

test('Production tab shows sub-navigation', async ({ page }) => {
  const sidebar = page.locator('aside');
  await sidebar.getByRole('button', { name: 'Production', exact: true }).click();
  await expect(sidebar.getByRole('button', { name: 'Work Orders' })).toBeVisible();
  await expect(sidebar.getByRole('button', { name: 'Production Schedule' })).toBeVisible();
  await expect(sidebar.getByRole('button', { name: 'Batch Builder' })).toBeVisible();
});

test('Production sub-nav: switches to Batch Builder', async ({ page }) => {
  const sidebar = page.locator('aside');
  await sidebar.getByRole('button', { name: 'Production', exact: true }).click();
  await sidebar.getByRole('button', { name: 'Batch Builder' }).click();
  await expect(page.getByRole('heading', { name: /batch/i })).toBeVisible();
});

test('R&D Lab tab shows sub-navigation', async ({ page }) => {
  const sidebar = page.locator('aside');
  await sidebar.getByRole('button', { name: 'R&D Lab' }).click();
  await expect(sidebar.getByRole('button', { name: 'AI Assistant' })).toBeVisible();
  await expect(sidebar.getByRole('button', { name: 'Calculators' })).toBeVisible();
});

test('switching tabs hides previous tab content', async ({ page }) => {
  const sidebar = page.locator('aside');

  // Navigate to Formulas
  await sidebar.getByRole('button', { name: 'Formula Library' }).click();
  await expect(page.getByText('Formula Library').first()).toBeVisible();

  // Switch to Inventory
  await sidebar.getByRole('button', { name: 'Inventory', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ingredient Stock' })).toBeVisible();

  // Formulas heading should no longer be in main content area
  await expect(page.getByRole('heading', { name: 'Formula Library' })).not.toBeVisible();
});
