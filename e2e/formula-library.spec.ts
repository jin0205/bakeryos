import { test, expect } from '@playwright/test';

const SAMPLE_RECIPE = {
  id: 'test-recipe-1',
  name: 'Country Sourdough',
  version: 1,
  history: [],
  flours: [{ name: 'Bread Flour', percentage: 85, grams: 850 }, { name: 'Whole Wheat', percentage: 15, grams: 150 }],
  ingredients: [{ name: 'Water', percentage: 75, grams: 750 }, { name: 'Salt', percentage: 2, grams: 20 }, { name: 'Starter', percentage: 20, grams: 200 }],
  weightPerLoaf: 900,
  numberOfLoaves: 2,
  notes: 'Test recipe for e2e',
};

test.describe('Formula Library — empty state', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('bakeryos_recipes'));
    await page.goto('/');
    // Navigate to Formula Library (app now starts on Home/Dashboard)
    await page.locator('aside').getByRole('button', { name: 'Formula Library' }).click();
  });

  test('shows empty state message when no formulas exist', async ({ page }) => {
    await expect(page.getByText(/your library is empty|no formulas|create your first|get started/i)).toBeVisible();
  });

  test('New Formula button is visible', async ({ page }) => {
    // Use the toolbar button (first one in the toolbar)
    await expect(page.getByRole('button', { name: '+ New Formula' }).first()).toBeVisible();
  });

  test('clicking New Formula opens the workbench', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Formula' }).first().click();
    await expect(page.getByRole('heading', { name: 'Formula Workbench' })).toBeVisible();
  });
});

test.describe('Formula Library — with recipes', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((recipe) => {
      localStorage.setItem('bakeryos_recipes', JSON.stringify({
        data: [recipe],
        updatedAt: new Date().toISOString(),
      }));
    }, SAMPLE_RECIPE);
    await page.goto('/');
    // Navigate to Formula Library (app now starts on Home/Dashboard)
    await page.locator('aside').getByRole('button', { name: 'Formula Library' }).click();
  });

  test('displays saved recipe by name', async ({ page }) => {
    await expect(page.getByText('Country Sourdough')).toBeVisible();
  });

  test('recipe card shows version number', async ({ page }) => {
    await expect(page.getByText(/v1/i)).toBeVisible();
  });

  test('clicking a recipe opens the context panel', async ({ page }) => {
    // Recipe rows now open a context panel instead of navigating to workbench
    await page.getByText('Country Sourdough').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Formula Detail')).toBeVisible();
  });

  test('edit button opens the workbench', async ({ page }) => {
    // Pencil/edit button in actions column opens workbench
    await page.getByRole('button', { name: 'Edit formula' }).click();
    await expect(page.getByRole('heading', { name: 'Formula Workbench' })).toBeVisible();
  });

  test('back button returns to library from workbench', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit formula' }).click();
    await expect(page.getByRole('heading', { name: 'Formula Workbench' })).toBeVisible();

    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByRole('heading', { name: 'Formula Library' })).toBeVisible();
  });
});
