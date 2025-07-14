import { test, expect } from '@playwright/test';

test.describe('Transaction Saving Functionality', () => {
  test('should be able to add a new transaction', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:19006');
    
    // Wait for the app to load
    await page.waitForSelector('text=All accounts');
    
    // Navigate to Transactions tab
    await page.getByText('Transactions').click();
    
    // Click the add transaction button (floating action button)
    await page.locator('button:has(svg[data-testid="plus"])').click();
    
    // Wait for the transaction form to appear
    await page.waitForSelector('text=Add Transaction');
    
    // Select expense type (should be default)
    await page.getByText('Expense').click();
    
    // Select an account
    await page.getByText('Select account').click();
    await page.waitForSelector('text=Select From Account');
    
    // Select the first account in the list
    const accountItem = await page.locator('.modalItem').first();
    await accountItem.click();
    
    // Select a category
    await page.getByText('Select category').click();
    await page.waitForSelector('text=Select Category');
    
    // Select the first category in the list
    const categoryItem = await page.locator('.modalItem').first();
    await categoryItem.click();
    
    // Enter amount
    await page.locator('input[placeholder="Enter amount"]').fill('100');
    
    // Enter notes
    await page.locator('textarea[placeholder="Add notes..."]').fill('Test transaction');
    
    // Save the transaction
    await page.getByText('Save').click();
    
    // Verify transaction was added
    await page.waitForSelector('text=Test transaction');
    
    // Verify the transaction amount
    await expect(page.getByText('₱ 100')).toBeVisible();
  });
}); 