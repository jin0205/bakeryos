import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('shows BakeryOS branding in sidebar', async ({ page }) => {
  await expect(page.getByText('BakeryOS')).toBeVisible();
  await expect(page.getByText('Production Intelligence Platform')).toBeVisible();
});

test('renders all main nav items', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Formula Library' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Production' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inventory' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cost & Margin' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'R&D Lab' })).toBeVisible();
});

test('Formula Library tab is active by default', async ({ page }) => {
  const formulaBtn = page.getByRole('button', { name: 'Formula Library' });
  await expect(formulaBtn).toHaveClass(/text-amber-700/);
  await expect(page.getByText('Formula Library').first()).toBeVisible();
});

test('navigates to Inventory tab', async ({ page }) => {
  await page.getByRole('button', { name: 'Inventory' }).click();
  await expect(page.getByRole('heading', { name: 'Inventory', exact: true })).toBeVisible();
});

test('navigates to Cost & Margin tab', async ({ page }) => {
  await page.getByRole('button', { name: 'Cost & Margin' }).click();
  await expect(page.getByRole('heading', { name: /cost/i })).toBeVisible();
});

test('Production tab shows sub-navigation', async ({ page }) => {
  await page.getByRole('button', { name: 'Production' }).click();
  await expect(page.getByRole('button', { name: 'Work Orders' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Production Schedule' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Batch Builder' })).toBeVisible();
});

test('Production sub-nav: switches to Batch Builder', async ({ page }) => {
  await page.getByRole('button', { name: 'Production' }).click();
  await page.getByRole('button', { name: 'Batch Builder' }).click();
  await expect(page.getByRole('heading', { name: /batch/i })).toBeVisible();
});

test('R&D Lab tab shows sub-navigation', async ({ page }) => {
  await page.getByRole('button', { name: 'R&D Lab' }).click();
  await expect(page.getByRole('button', { name: "Baker's Assistant" })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recipe Brainstormer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fermentation Engine' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'DDT Water Temp' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recipe Importer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Converter' })).toBeVisible();
});

test('switching tabs hides previous tab content', async ({ page }) => {
  // Start on Formulas
  await expect(page.getByText('Formula Library').first()).toBeVisible();

  // Switch to Inventory
  await page.getByRole('button', { name: 'Inventory' }).click();
  await expect(page.getByRole('heading', { name: 'Inventory', exact: true })).toBeVisible();

  // Formulas heading should no longer be in main content area
  await expect(page.getByRole('heading', { name: 'Formula Library' })).not.toBeVisible();
});
