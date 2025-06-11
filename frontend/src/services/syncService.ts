import NetInfo from '@react-native-community/netinfo';
import { storageService } from './storageService';

class SyncService {
  private isOnline: boolean = false;
  private syncInProgress: boolean = false;
  private syncQueue: Array<() => Promise<void>> = [];
  private readonly BASE_URL = 'https://yezfovq877.execute-api.ap-southeast-1.amazonaws.com/test/api'; // Replace with your backend URL

  constructor() {
    this.initializeNetworkListener();
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (!wasOnline && this.isOnline) {
        // Just came online, attempt to sync
        this.processSyncQueue();
      }
    });

    // Initial check
    NetInfo.fetch().then(state => {
      this.isOnline = state.isConnected ?? false;
    });
  }

  getConnectionStatus(): boolean {
    return this.isOnline;
  }

  isSyncing(): boolean {
    return this.syncInProgress;
  }

  async syncData(): Promise<void> {
    if (!this.isOnline) {
      console.log('Offline - skipping sync');
      return;
    }

    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return;
    }

    try {
      this.syncInProgress = true;
      
      // Push local changes to server
      await this.pushChangesToServer();
      
      // Pull server changes
      await this.pullChangesFromServer();
      
      // Update last sync time
      await storageService.setLastSyncTime(new Date());
      
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  async forceSyncNow(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    await this.syncData();
  }

  private async pushChangesToServer(): Promise<void> {
    try {
      // Push unsynced accounts
      const unsyncedAccounts = await storageService.getUnsyncedAccounts();
      console.log('🔄 Unsynced accounts to push:', JSON.stringify({
        count: unsyncedAccounts.length,
        accounts: unsyncedAccounts.map(a => ({ id: a.id, name: a.name, synced: a.synced, serverId: a.serverId }))
      }, null, 2));
      
      if (unsyncedAccounts.length > 0) {
        const accountsToSync = unsyncedAccounts.map(acc => ({
          name: acc.name,
          description: acc.description,
          localId: acc.id,
          serverId: acc.serverId, // Include serverId for updates
          updatedAt: acc.updatedAt,
          order: acc.order || 0
        }));

        console.log('📤 Sending accounts to server:', JSON.stringify(accountsToSync, null, 2));

        const response = await fetch(`${this.BASE_URL}/sync/push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accounts: accountsToSync,
            transactions: []
          }),
        });

        if (!response.ok) {
          throw new Error(`Push failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('📥 Server response:', JSON.stringify(result, null, 2));
        
        // Map local IDs to server IDs and mark as synced
        const localToServerIdMap: Record<string, string> = {};
        if (result.results?.accounts) {
          result.results.accounts.forEach((acc: any) => {
            if (acc.success && acc.localId && acc.serverId) {
              localToServerIdMap[acc.localId] = acc.serverId;
              console.log(`✅ Mapping local ID ${acc.localId} to server ID ${acc.serverId}`);
            }
          });
        }
        
        console.log('🔗 ID mapping for accounts:', JSON.stringify(localToServerIdMap, null, 2));
        await storageService.markAccountsSynced(localToServerIdMap);
        console.log('✅ Marked accounts as synced');
      }

      // Push unsynced transactions
      const unsyncedTransactions = await storageService.getUnsyncedTransactions();
      if (unsyncedTransactions.length > 0) {
        const transactionsToSync = unsyncedTransactions.map(tr => ({
          fromAccount: tr.fromAccount,
          toAccount: tr.toAccount,
          category: tr.category,
          amount: tr.amount,
          transactionDate: tr.transactionDate,
          description: tr.description,
          localId: tr.id,
          serverId: tr.serverId
        }));

        const response = await fetch(`${this.BASE_URL}/sync/push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accounts: [],
            transactions: transactionsToSync
          }),
        });

        if (!response.ok) {
          throw new Error(`Push transactions failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Map local IDs to server IDs and mark as synced
        const localToServerIdMap: Record<string, string> = {};
        if (result.results?.transactions) {
          result.results.transactions.forEach((tr: any) => {
            if (tr.success && tr.localId && tr.serverId) {
              localToServerIdMap[tr.localId] = tr.serverId;
            }
          });
        }
        
        await storageService.markTransactionsSynced(localToServerIdMap);
      }
    } catch (error) {
      console.error('Push to server failed:', error);
      throw error;
    }
  }

  private async pullChangesFromServer(): Promise<void> {
    try {
      const lastSync = await storageService.getLastSyncTime();
      const since = lastSync ? lastSync.toISOString() : new Date(0).toISOString();
      
      console.log('📥 Pulling changes from server since:', since);

      const response = await fetch(`${this.BASE_URL}/sync/pull?since=${since}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Pull failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 Server data received:', JSON.stringify({
        accountsCount: data.accounts?.length || 0,
        transactionsCount: data.transactions?.length || 0,
        accounts: data.accounts?.map((a: any) => ({ _id: a._id, name: a.name })) || []
      }, null, 2));
      
      // Get current local data before merge
      const localAccountsBefore = await storageService.getAccounts();
      console.log('📋 Local accounts before merge:', JSON.stringify(
        localAccountsBefore.map(a => ({ id: a.id, name: a.name, synced: a.synced, serverId: a.serverId })), 
        null, 2
      ));
      
      // Merge server data with local data
      if (data.accounts && data.accounts.length > 0) {
        await storageService.mergeServerAccounts(data.accounts);
        console.log('✅ Merged server accounts');
      } else {
        console.log('📭 No server accounts to merge');
      }
      
      if (data.transactions && data.transactions.length > 0) {
        await storageService.mergeServerTransactions(data.transactions);
        console.log('✅ Merged server transactions');
      } else {
        console.log('📭 No server transactions to merge');
      }
      
      // Check local data after merge
      const localAccountsAfter = await storageService.getAccounts();
      console.log('📋 Local accounts after merge:', JSON.stringify(
        localAccountsAfter.map(a => ({ id: a.id, name: a.name, synced: a.synced, serverId: a.serverId })), 
        null, 2
      ));
      
    } catch (error) {
      console.error('Pull from server failed:', error);
      throw error;
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.length === 0) {
      return;
    }

    const queue = [...this.syncQueue];
    this.syncQueue = [];

    for (const syncTask of queue) {
      try {
        await syncTask();
      } catch (error) {
        console.error('Queued sync task failed:', error);
      }
    }
  }

  // Add operations to sync queue when offline
  queueSync(operation: () => Promise<void>): void {
    this.syncQueue.push(operation);
  }
}

export const syncService = new SyncService(); 