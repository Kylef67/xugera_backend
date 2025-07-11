import NetInfo from '@react-native-community/netinfo';
import { databaseService, SyncableAccount } from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SyncResult {
  success: boolean;
  error?: string;
  pulledCount?: number;
  pushedCount?: number;
}

export interface ServerAccount {
  id: string;
  name: string;
  description: string;
  balance?: number;
  type?: string;
  icon?: string;
  color?: string;
  includeInTotal?: boolean;
  creditLimit?: number;
  updatedAt: number;
  isDeleted?: boolean;
  hash?: string; // Added hash for efficient change detection
}

// Hash function to generate a content hash for change detection
const generateAccountHash = (account: SyncableAccount): string => {
  const accountData = {
    name: account.name,
    description: account.description || '',
    balance: account.balance,
    type: account.type,
    icon: account.icon,
    color: account.color,
    includeInTotal: account.includeInTotal,
    creditLimit: account.creditLimit,
    isDeleted: account.isDeleted
  };
  return btoa(JSON.stringify(accountData));
};

class SyncService {
  private baseUrl = 'https://yezfovq877.execute-api.ap-southeast-1.amazonaws.com/test/api';
  private isSyncing = false;
  private syncCallbacks: ((result: SyncResult) => void)[] = [];
  private readonly BATCH_SIZE = 20; // Process accounts in batches for better performance

  async isOnline(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return !!(netInfo.isConnected && netInfo.isInternetReachable);
  }

  async sync(force: boolean = false): Promise<SyncResult> {
    if (this.isSyncing && !force) {
      return { success: false, error: 'Sync already in progress' };
    }

    if (!databaseService.isReady()) {
      return { success: false, error: 'Database not initialized' };
    }

    if (!(await this.isOnline())) {
      return { success: false, error: 'No internet connection' };
    }

    this.isSyncing = true;
    
    try {
      // First push local changes to server
      const pushResult = await this.pushToServer();
      if (!pushResult.success) {
        this.isSyncing = false;
        return pushResult;
      }
      
      // Only pull if we haven't pushed anything (to check for server changes)
      // or if force=true (manual sync)
      let pullResult: SyncResult = { success: true, pulledCount: 0 };
      if (pushResult.pushedCount === 0 || force) {
        pullResult = await this.pullFromServer();
        if (!pullResult.success) {
          this.isSyncing = false;
          return pullResult;
        }
      }

      const result: SyncResult = {
        success: true,
        pulledCount: pullResult.pulledCount,
        pushedCount: pushResult.pushedCount
      };

      console.log(`Sync completed - Pushed: ${result.pushedCount}, Pulled: ${result.pulledCount}`);
      this.notifyCallbacks(result);
      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      this.isSyncing = false;
      return { success: false, error: (error as Error).message };
    } finally {
      this.isSyncing = false;
    }
  }

  private async pullFromServer(): Promise<SyncResult> {
    try {
      const lastSyncTimestamp = await databaseService.getLastSyncTimestamp();
      const localAccountHashes = await this.getLocalAccountHashes();
      
      const response = await fetch(`${this.baseUrl}/account/sync/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lastSyncTimestamp,
          accountHashes: localAccountHashes
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Sync pull failed with status ${response.status}:`, errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const serverAccounts: ServerAccount[] = data.accounts || [];
      const serverTimestamp = data.timestamp || Date.now();

      let pulledCount = 0;
      
      // Process accounts in batches for better performance
      for (let i = 0; i < serverAccounts.length; i += this.BATCH_SIZE) {
        const batch = serverAccounts.slice(i, i + this.BATCH_SIZE);
        const accountsToUpdate: SyncableAccount[] = [];

        // First, gather all accounts that need updating
        for (const serverAccount of batch) {
          const localAccount = await databaseService.getAccountById(serverAccount.id);
          
          if (this.shouldUpdateLocal(localAccount, serverAccount)) {
            const syncableAccount: SyncableAccount = {
              id: serverAccount.id,
              name: serverAccount.name,
              balance: serverAccount.balance || 0,
              type: (serverAccount.type as 'debit' | 'credit' | 'wallet') || 'debit',
              icon: serverAccount.icon || 'bank',
              color: serverAccount.color || '#007AFF',
              description: serverAccount.description,
              includeInTotal: serverAccount.includeInTotal !== false,
              creditLimit: serverAccount.creditLimit,
              updatedAt: serverAccount.updatedAt,
              serverUpdatedAt: serverAccount.updatedAt,
              isDeleted: serverAccount.isDeleted || false
            };
            accountsToUpdate.push(syncableAccount);
          }
        }

        // Then, perform all updates in a single batch
        if (accountsToUpdate.length > 0) {
          await Promise.all(accountsToUpdate.map(async account => {
            if (account.isDeleted) {
              await databaseService.deleteAccount(account.id);
            } else {
              await databaseService.saveAccount(account);
            }
          }));
          
          pulledCount += accountsToUpdate.length;
          console.log(`Updated ${accountsToUpdate.length} accounts from server`);
        }
      }

      if (pulledCount > 0) {
        await databaseService.setLastSyncTimestamp(serverTimestamp);
      }
      return { success: true, pulledCount };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Get local account hashes for efficient delta sync
  private async getLocalAccountHashes(): Promise<Record<string, string>> {
    const accounts = await databaseService.getAllAccounts(true); // Include deleted accounts
    const hashes: Record<string, string> = {};
    
    for (const account of accounts) {
      hashes[account.id] = generateAccountHash(account);
    }
    
    return hashes;
  }

  private async pushToServer(): Promise<SyncResult> {
    try {
      const unsyncedAccounts = await databaseService.getUnsyncedAccounts();
      
      if (unsyncedAccounts.length === 0) {
        return { success: true, pushedCount: 0 };
      }

      console.log(`Found ${unsyncedAccounts.length} accounts that need syncing`);
      
      // Process accounts in batches to avoid large payloads
      let totalPushedCount = 0;
      
      for (let i = 0; i < unsyncedAccounts.length; i += this.BATCH_SIZE) {
        const batchAccounts = unsyncedAccounts.slice(i, i + this.BATCH_SIZE);
        
        // Transform accounts for server sync
        const accountsToSync = batchAccounts.map(account => ({
          id: account.id,
          name: account.name,
          description: account.description || '',
          balance: account.balance,
          type: account.type,
          icon: account.icon,
          color: account.color,
          includeInTotal: account.includeInTotal,
          creditLimit: account.creditLimit,
          updatedAt: account.updatedAt,
          isDeleted: account.isDeleted,
          hash: generateAccountHash(account)
        }));

        console.log(`Syncing batch of ${accountsToSync.length} accounts to server`);

        const response = await fetch(`${this.baseUrl}/account/sync/push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accounts: accountsToSync
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Sync push failed with status ${response.status}:`, errorText);
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const serverTimestamp = data.timestamp || Date.now();
        const acceptedAccounts = data.acceptedAccounts || [];

        console.log(`Server accepted ${acceptedAccounts.length} accounts`);

        // Only update server timestamps for accounts that were actually accepted by the server
        await Promise.all(
          batchAccounts
            .filter(account => acceptedAccounts.includes(account.id))
            .map(async account => {
              console.log(`Updating server timestamp for account ${account.id} to ${serverTimestamp}`);
              await databaseService.updateServerTimestamp(account.id, serverTimestamp);
            })
        );
        
        totalPushedCount += acceptedAccounts.length;
      }

      console.log(`Total accounts pushed: ${totalPushedCount}`);
      return { success: true, pushedCount: totalPushedCount };
    } catch (error) {
      console.error('Push to server failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  private shouldUpdateLocal(localAccount: SyncableAccount | null, serverAccount: ServerAccount): boolean {
    // If there's no local account, always accept server data
    if (!localAccount) {
      return true;
    }
    
    // If local changes haven't been synced yet (local.updatedAt > local.serverUpdatedAt),
    // don't overwrite with server data unless server data is newer than local changes
    if (localAccount.updatedAt > (localAccount.serverUpdatedAt || 0)) {
      return serverAccount.updatedAt > localAccount.updatedAt;
    }
    
    // If server has a hash and it matches local account's current state, skip update
    if (serverAccount.hash) {
      const localHash = generateAccountHash(localAccount);
      if (serverAccount.hash === localHash) {
        return false;
      }
    }
    
    // Otherwise, accept server updates if they're newer than the last sync
    return serverAccount.updatedAt > (localAccount.serverUpdatedAt || 0);
  }

  addSyncCallback(callback: (result: SyncResult) => void): void {
    this.syncCallbacks.push(callback);
  }

  removeSyncCallback(callback: (result: SyncResult) => void): void {
    this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
  }

  private notifyCallbacks(result: SyncResult): void {
    this.syncCallbacks.forEach(callback => callback(result));
  }

  async scheduleAutoSync(): Promise<void> {
    const autoSyncEnabledStr = await AsyncStorage.getItem('autoSyncEnabled');
    if (autoSyncEnabledStr === 'false') {
      return;
    }

    const autoSyncIntervalStr = await AsyncStorage.getItem('autoSyncInterval');
    const autoSyncInterval = autoSyncIntervalStr ? parseInt(autoSyncIntervalStr) : 30000;
    
    const intervalId = setInterval(async () => {
      if (await this.isOnline()) {
        await this.sync();
      }
    }, autoSyncInterval);

    await AsyncStorage.setItem('syncIntervalId', intervalId.toString());
  }

  async stopAutoSync(): Promise<void> {
    const intervalIdStr = await AsyncStorage.getItem('syncIntervalId');
    if (intervalIdStr) {
      clearInterval(parseInt(intervalIdStr));
      await AsyncStorage.removeItem('syncIntervalId');
    }
  }

  async setAutoSyncEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem('autoSyncEnabled', enabled.toString());
    
    if (enabled) {
      this.scheduleAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  async setAutoSyncInterval(intervalMs: number): Promise<void> {
    await AsyncStorage.setItem('autoSyncInterval', intervalMs.toString());
    
    // Restart auto-sync with new interval if enabled
    await this.stopAutoSync();
    const autoSyncEnabledStr = await AsyncStorage.getItem('autoSyncEnabled');
    if (autoSyncEnabledStr !== 'false') {
      await this.scheduleAutoSync();
    }
  }
}

export const syncService = new SyncService();
export default syncService; 