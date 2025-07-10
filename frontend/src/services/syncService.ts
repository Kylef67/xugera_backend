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
}

class SyncService {
  private baseUrl = 'https://yezfovq877.execute-api.ap-southeast-1.amazonaws.com/test/api';
  private isSyncing = false;
  private syncCallbacks: ((result: SyncResult) => void)[] = [];

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
      // First push local changes to server to avoid them being overwritten
      const pushResult = await this.pushToServer();
      if (!pushResult.success) {
        this.isSyncing = false;
        return pushResult;
      }
      
      // Then pull changes from server
      const pullResult = await this.pullFromServer();
      if (!pullResult.success) {
        this.isSyncing = false;
        return pullResult;
      }

      const result: SyncResult = {
        success: true,
        pulledCount: pullResult.pulledCount,
        pushedCount: pushResult.pushedCount
      };

      this.notifyCallbacks(result);
      return result;
    } catch (error) {
      this.isSyncing = false;
      return { success: false, error: (error as Error).message };
    } finally {
      this.isSyncing = false;
    }
  }

  private async pullFromServer(): Promise<SyncResult> {
    try {
      const lastSyncTimestamp = await databaseService.getLastSyncTimestamp();
      
      const response = await fetch(`${this.baseUrl}/account/sync/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lastSyncTimestamp
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
      
      for (const serverAccount of serverAccounts) {
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

          if (serverAccount.isDeleted) {
            await databaseService.deleteAccount(serverAccount.id);
          } else {
            await databaseService.saveAccount(syncableAccount);
          }
          
          pulledCount++;
        }
      }

      await databaseService.setLastSyncTimestamp(serverTimestamp);
      return { success: true, pulledCount };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async pushToServer(): Promise<SyncResult> {
    try {
      const unsyncedAccounts = await databaseService.getUnsyncedAccounts();
      
      if (unsyncedAccounts.length === 0) {
        return { success: true, pushedCount: 0 };
      }

      const accountsToSync = unsyncedAccounts.map(account => ({
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
        isDeleted: account.isDeleted
      }));

      console.log('Syncing accounts to server:', JSON.stringify(accountsToSync, null, 2));

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

      for (const account of unsyncedAccounts) {
        await databaseService.updateServerTimestamp(account.id, serverTimestamp);
      }

      return { success: true, pushedCount: unsyncedAccounts.length };
    } catch (error) {
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

  async setAutoSyncInterval(interval: number): Promise<void> {
    await AsyncStorage.setItem('autoSyncInterval', interval.toString());
    
    const autoSyncEnabledStr = await AsyncStorage.getItem('autoSyncEnabled');
    if (autoSyncEnabledStr !== 'false') {
      this.stopAutoSync();
      this.scheduleAutoSync();
    }
  }
}

export const syncService = new SyncService(); 