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
    await page.addInitScript(() => localStorage.removeItem('sourdough_recipes'));
    await page.goto('/');
  });

  test('shows empty state message when no formulas exist', async ({ page }) => {
    // Empty state should prompt user to create their first formula
    await expect(page.getByText(/no formulas|create your first|get started/i)).toBeVisible();
  });

  test('New Formula button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new formula/i })).toBeVisible();
  });

  test('clicking New Formula opens the workbench', async ({ page }) => {
    await page.getByRole('button', { name: /new formula/i }).click();
    await expect(page.getByRole('heading', { name: 'Formula Workbench' })).toBeVisible();
  });
});

test.describe('Formula Library — with recipes', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((recipe) => {
      localStorage.setItem('sourdough_recipes', JSON.stringify([recipe]));
    }, SAMPLE_RECIPE);
    await page.goto('/');
  });

  test('displays saved recipe by name', async ({ page }) => {
    await expect(page.getByText('Country Sourdough')).toBeVisible();
  });

  test('recipe card shows version number', async ({ page }) => {
    await expect(page.getByText(/v1/i)).toBeVisible();
  });

  test('clicking a recipe opens the workbench', async ({ page }) => {
    // Recipe rows are clickable - click the recipe name
    await page.getByText('Country Sourdough').click();
    await expect(page.getByRole('heading', { name: 'Formula Workbench' })).toBeVisible();
  });

  test('back button returns to library from workbench', async ({ page }) => {
    await page.getByText('Country Sourdough').click();
    await expect(page.getByRole('heading', { name: 'Formula Workbench' })).toBeVisible();

    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByRole('heading', { name: 'Formula Library' })).toBeVisible();
  });
});
