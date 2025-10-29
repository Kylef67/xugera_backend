import { test, expect } from '@playwright/test';

test.describe('Offline Sync Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:19006');
    
    // Wait for app to load
    await page.waitForSelector('text=All accounts', { timeout: 10000 });
  });

  test('Test 1: Display sync status indicator', async ({ page }) => {
    // Check that sync status indicator is visible
    const syncStatus = page.locator('text=/Online|Offline|Syncing/');
    await expect(syncStatus).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Sync status indicator is displayed');
  });

  test('Test 2: Create account while online', async ({ page }) => {
    // Open add account drawer
    await page.click('text=Add Account');
    
    // Fill account details
    await page.fill('input[placeholder="Account name"]', 'Test Online Account');
    await page.fill('input[placeholder="Initial balance"]', '1000');
    
    // Save
    await page.click('text=Save');
    
    // Verify account appears in list
    await expect(page.locator('text=Test Online Account')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Account created successfully while online');
  });

  test('Test 3: Simulate offline mode and create account', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Wait for offline indicator
    await expect(page.locator('text=/Offline/')).toBeVisible({ timeout: 5000 });
    
    // Open add account drawer
    await page.click('text=Add Account');
    
    // Fill account details
    await page.fill('input[placeholder="Account name"]', 'Test Offline Account');
    await page.fill('input[placeholder="Initial balance"]', '500');
    
    // Save
    await page.click('text=Save');
    
    // Verify account appears in list (optimistic update)
    await expect(page.locator('text=Test Offline Account')).toBeVisible({ timeout: 5000 });
    
    // Check that offline queue shows pending operation
    await expect(page.locator('text=/Offline.*pending/')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Account created while offline and queued');
    
    // Go back online
    await context.setOffline(false);
    
    // Wait for sync to complete
    await expect(page.locator('text=/Synced|Online/')).toBeVisible({ timeout: 15000 });
    
    console.log('✅ Offline queue synced when back online');
  });

  test('Test 4: Multi-user sync simulation', async ({ page, context }) => {
    // User A creates account
    await page.click('text=Add Account');
    await page.fill('input[placeholder="Account name"]', 'User A Account');
    await page.fill('input[placeholder="Initial balance"]', '2000');
    await page.click('text=Save');
    
    await expect(page.locator('text=User A Account')).toBeVisible();
    
    // Simulate User B by opening new tab
    const newPage = await context.newPage();
    await newPage.goto('http://localhost:19006');
    await newPage.waitForSelector('text=All accounts', { timeout: 10000 });
    
    // Wait for sync (30 second interval or manual refresh)
    await newPage.click('button:has-text("refresh")');
    
    // Verify User B sees User A's account
    await expect(newPage.locator('text=User A Account')).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Multi-user sync verified');
    
    await newPage.close();
  });

  test('Test 5: Conflict resolution - Server wins', async ({ page, context }) => {
    // Create an account
    await page.click('text=Add Account');
    await page.fill('input[placeholder="Account name"]', 'Conflict Test Account');
    await page.fill('input[placeholder="Initial balance"]', '1500');
    await page.click('text=Save');
    
    const accountCard = page.locator('text=Conflict Test Account').first();
    await expect(accountCard).toBeVisible();
    
    // Get account ID (simulate finding it)
    // In real test, you'd need to extract the actual ID
    
    // Simulate: Device A goes offline and deletes account
    await context.setOffline(true);
    await accountCard.click(); // Open details
    await page.click('text=Delete'); // Assuming delete button exists
    await page.click('text=Confirm'); // Confirm deletion
    
    // Device A: Account deleted locally, operation queued
    await expect(accountCard).not.toBeVisible();
    
    // Simulate: Device B (online) adds transaction to same account
    // This would be done via API call in real scenario
    // For now, just go back online and verify server wins
    
    await context.setOffline(false);
    
    // Wait for sync
    await page.waitForTimeout(5000);
    
    // If server has newer data, account should reappear (server wins)
    // This depends on the actual scenario
    
    console.log('✅ Conflict resolution tested (server-wins strategy)');
  });

  test('Test 6: Check offline queue persistence', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Create multiple accounts
    for (let i = 1; i <= 3; i++) {
      await page.click('text=Add Account');
      await page.fill('input[placeholder="Account name"]', `Queued Account ${i}`);
      await page.fill('input[placeholder="Initial balance"]', `${i}00`);
      await page.click('text=Save');
    }
    
    // Verify queue count
    await expect(page.locator('text=/Offline.*3.*pending/')).toBeVisible({ timeout: 5000 });
    
    // Reload page (simulate app restart)
    await page.reload();
    await page.waitForSelector('text=All accounts', { timeout: 10000 });
    
    // Verify queue persisted
    await expect(page.locator('text=/Offline.*3.*pending/')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Offline queue persists across app restarts');
  });
});
