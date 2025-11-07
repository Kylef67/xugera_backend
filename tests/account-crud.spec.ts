import { test, expect } from '@playwright/test';

test.describe('Account CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8081');
    // Wait for accounts to load
    await page.waitForTimeout(3000);
  });

  test('should create a new account', async ({ page }) => {
    const accountName = `E2E Test ${Date.now()}`;
    
    // Click the add button (󰐕 icon) using the exact Playwright code that worked in MCP
    await page.getByText('󰐕').click();
    
    // Wait for form to appear
    await page.waitForSelector('text=New account', { timeout: 5000 });
    
    // Fill in account name - using the exact selector from MCP that worked
    await page.getByRole('textbox', { name: 'Account name' }).fill(accountName);
    
    // Click Done button
    await page.getByText('Done').click();
    
    // Wait for the API call to complete
    await page.waitForTimeout(2000);
    
    // Verify account appears in the list
    await expect(page.getByText(accountName).first()).toBeVisible({ timeout: 5000 });
    console.log('✓ Account created successfully');
  });

  test('should edit an existing account', async ({ page }) => {
    const originalName = `E2E Test ${Date.now()}`;
    const updatedName = `Updated ${Date.now()}`;
    
    // First, create an account to edit
    await page.getByText('󰐕').click();
    await page.waitForSelector('text=New account');
    await page.getByRole('textbox', { name: 'Account name' }).fill(originalName);
    await page.getByText('Done').click();
    await page.waitForTimeout(2000);
    
    // Verify account was created
    await expect(page.getByText(originalName).first()).toBeVisible();
    
    // Click on the account name to open edit form
    await page.getByText(originalName).first().click();
    
    // Wait for edit form
    await page.waitForSelector('text=Edit account', { timeout: 5000 });
    
    // Update the name
    const nameInput = page.getByRole('textbox', { name: 'Account name' });
    await nameInput.click();
    await nameInput.press('Control+a'); // Select all
    await nameInput.fill(updatedName);
    
    // Save changes
    await page.getByText('Done').click();
    await page.waitForTimeout(2000);
    
    // Verify updated name appears
    await expect(page.getByText(updatedName).first()).toBeVisible({ timeout: 5000 });
    console.log('✓ Account edited successfully');
  });

  test('should delete an account', async ({ page }) => {
    const accountName = `Delete Me ${Date.now()}`;
    
    // Create an account to delete
    await page.getByText('󰐕').click();
    await page.waitForSelector('text=New account');
    await page.getByRole('textbox', { name: 'Account name' }).fill(accountName);
    await page.getByText('Done').click();
    await page.waitForTimeout(2000);
    
    // Verify it was created - get the specific account row
    const accountRow = page.locator('[data-testid="account-item-pressable"]').filter({ hasText: accountName });
    await expect(accountRow.first()).toBeVisible();
    
    // Set up dialog handler to accept confirmation
    page.on('dialog', async dialog => {
      console.log('Confirming deletion:', dialog.message());
      await dialog.accept();
    });
    
    // Find and click the delete button for this specific account
    const deleteButton = accountRow.locator('[data-testid^="delete-account-"]').first();
    await deleteButton.click();
    
    // Wait for the account row to be removed from the DOM
    await expect(accountRow.first()).not.toBeVisible({ timeout: 5000 });
    
    console.log('✓ Account deleted successfully');
  });
});
