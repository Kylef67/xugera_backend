import { apiService } from './apiService';
import storageService from './storageService';
import type { OfflineOperation, SyncResult, SyncChangesResponse } from '../types/offline';
import type { Account, Category, Transaction } from '../contexts/DataContext';

class SyncService {
  private isSyncing: boolean = false;

  /**
   * Perform incremental sync - fetch changes from server since last sync
   */
  async performIncrementalSync(lastSyncTimestamp: number, deviceId: string): Promise<SyncChangesResponse | null> {
    try {
      console.log(`🔄 Fetching changes since ${new Date(lastSyncTimestamp).toISOString()}`);
      
      const response = await apiService.syncChanges(lastSyncTimestamp, deviceId);
      
      if (response.success && response.data) {
        console.log(`✅ Received ${response.data.accounts?.length || 0} accounts, ${response.data.categories?.length || 0} categories, ${response.data.transactions?.length || 0} transactions`);
        return response.data;
      } else {
        console.error('❌ Incremental sync failed:', response.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Error during incremental sync:', error);
      return null;
    }
  }

  /**
   * Push offline queue to server
   */
  async pushOfflineQueue(queue: OfflineOperation[], deviceId: string): Promise<SyncResult | null> {
    try {
      if (queue.length === 0) {
        console.log('ℹ️  No offline operations to push');
        return {
          success: true,
          accepted: [],
          conflicts: [],
          rejected: [],
          serverData: { accounts: [], categories: [], transactions: [] }
        };
      }

      console.log(`📤 Pushing ${queue.length} offline operations`);
      
      const response = await apiService.pushOfflineOperations(queue, deviceId);
      
      if (response.success && response.data) {
        console.log(`✅ Push complete: ${response.data.accepted?.length || 0} accepted, ${response.data.conflicts?.length || 0} conflicts, ${response.data.rejected?.length || 0} rejected`);
        return response.data;
      } else {
        console.error('❌ Push failed:', response.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Error pushing offline queue:', error);
      return null;
    }
  }

  /**
   * Merge server changes with local data
   * Server-wins strategy: Server data always takes precedence
   */
  mergeServerChanges(
    localAccounts: Account[],
    localCategories: Category[],
    localTransactions: Transaction[],
    serverChanges: SyncChangesResponse
  ): {
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
  } {
    console.log('🔀 Merging server changes with local data');

    // Merge accounts
    const accountsMap = new Map(localAccounts.map(a => [a.id, a]));
    serverChanges.accounts.forEach(serverAccount => {
      accountsMap.set(serverAccount.id, serverAccount as Account);
    });
    const mergedAccounts = Array.from(accountsMap.values())
      .filter(a => !a.isDeleted) // Filter out deleted accounts
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Merge categories
    const categoriesMap = new Map(localCategories.map(c => [c.id, c]));
    serverChanges.categories.forEach(serverCategory => {
      categoriesMap.set(serverCategory.id, serverCategory as Category);
    });
    const mergedCategories = Array.from(categoriesMap.values());

    // Merge transactions
    const transactionsMap = new Map(localTransactions.map(t => [t.id, t]));
    serverChanges.transactions.forEach(serverTransaction => {
      transactionsMap.set(serverTransaction.id, serverTransaction as Transaction);
    });
    const mergedTransactions = Array.from(transactionsMap.values())
      .filter(t => !t.isDeleted); // Filter out deleted transactions

    console.log(`✅ Merged: ${mergedAccounts.length} accounts, ${mergedCategories.length} categories, ${mergedTransactions.length} transactions`);

    return {
      accounts: mergedAccounts,
      categories: mergedCategories,
      transactions: mergedTransactions
    };
  }

  /**
   * Process conflicts from sync result
   * Returns arrays of conflicted operation IDs to remove from queue
   */
  processConflicts(syncResult: SyncResult): {
    operationIdsToRemove: string[];
    conflictedData: {
      accounts: Account[];
      categories: Category[];
      transactions: Transaction[];
    };
  } {
    console.log(`⚠️  Processing ${syncResult.conflicts.length} conflicts`);

    const operationIdsToRemove: string[] = [];
    const conflictedAccounts: Account[] = [];
    const conflictedCategories: Category[] = [];
    const conflictedTransactions: Transaction[] = [];

    syncResult.conflicts.forEach(conflict => {
      console.log(`  Conflict: ${conflict.reason} (operation ${conflict.operationId})`);
      
      // Remove conflicted operation from queue (server wins)
      operationIdsToRemove.push(conflict.operationId);
      
      // Collect server records to apply locally
      if (conflict.serverRecord) {
        // Determine resource type from server record structure
        if ('balance' in conflict.serverRecord && 'type' in conflict.serverRecord) {
          conflictedAccounts.push(conflict.serverRecord as Account);
        } else if ('parent' in conflict.serverRecord) {
          conflictedCategories.push(conflict.serverRecord as Category);
        } else if ('transactionDate' in conflict.serverRecord) {
          conflictedTransactions.push(conflict.serverRecord as Transaction);
        }
      }
    });

    return {
      operationIdsToRemove,
      conflictedData: {
        accounts: conflictedAccounts,
        categories: conflictedCategories,
        transactions: conflictedTransactions
      }
    };
  }

  /**
   * Full sync cycle: Push queue → Fetch changes → Merge
   */
  async fullSync(
    currentAccounts: Account[],
    currentCategories: Category[],
    currentTransactions: Transaction[],
    offlineQueue: OfflineOperation[],
    lastSyncTimestamp: number
  ): Promise<{
    success: boolean;
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
    newQueue: OfflineOperation[];
    newTimestamp: number;
    conflicts: number;
  } | null> {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping');
      return null;
    }

    this.isSyncing = true;

    try {
      const deviceId = await storageService.getDeviceId();
      
      // Step 1: Push offline queue
      const pushResult = await this.pushOfflineQueue(offlineQueue, deviceId);
      
      if (!pushResult) {
        this.isSyncing = false;
        return null;
      }

      // Step 2: Process conflicts and update queue
      const { operationIdsToRemove, conflictedData } = this.processConflicts(pushResult);
      
      // Remove accepted and conflicted operations from queue
      const acceptedIds = pushResult.accepted.map(a => a.operationId);
      const newQueue = offlineQueue.filter(
        op => !acceptedIds.includes(op.operationId) && !operationIdsToRemove.includes(op.operationId)
      );

      // Step 3: Apply server data from push result (accepted + conflicts)
      let updatedAccounts = [...currentAccounts];
      let updatedCategories = [...currentCategories];
      let updatedTransactions = [...currentTransactions];

      // Apply server data from push
      pushResult.serverData.accounts.forEach(serverAccount => {
        const index = updatedAccounts.findIndex(a => a.id === serverAccount.id);
        if (index >= 0) {
          updatedAccounts[index] = serverAccount as Account;
        } else {
          updatedAccounts.push(serverAccount as Account);
        }
      });

      pushResult.serverData.categories.forEach(serverCategory => {
        const index = updatedCategories.findIndex(c => c.id === serverCategory.id);
        if (index >= 0) {
          updatedCategories[index] = serverCategory as Category;
        } else {
          updatedCategories.push(serverCategory as Category);
        }
      });

      pushResult.serverData.transactions.forEach(serverTransaction => {
        const index = updatedTransactions.findIndex(t => t.id === serverTransaction.id);
        if (index >= 0) {
          updatedTransactions[index] = serverTransaction as Transaction;
        } else {
          updatedTransactions.push(serverTransaction as Transaction);
        }
      });

      // Apply conflicted data (server wins)
      conflictedData.accounts.forEach(serverAccount => {
        const index = updatedAccounts.findIndex(a => a.id === serverAccount.id);
        if (index >= 0) {
          updatedAccounts[index] = serverAccount;
        } else {
          updatedAccounts.push(serverAccount);
        }
      });

      conflictedData.categories.forEach(serverCategory => {
        const index = updatedCategories.findIndex(c => c.id === serverCategory.id);
        if (index >= 0) {
          updatedCategories[index] = serverCategory;
        } else {
          updatedCategories.push(serverCategory);
        }
      });

      conflictedData.transactions.forEach(serverTransaction => {
        const index = updatedTransactions.findIndex(t => t.id === serverTransaction.id);
        if (index >= 0) {
          updatedTransactions[index] = serverTransaction;
        } else {
          updatedTransactions.push(serverTransaction);
        }
      });

      // Step 4: Fetch incremental changes from other devices
      const serverChanges = await this.performIncrementalSync(lastSyncTimestamp, deviceId);
      
      if (serverChanges) {
        const merged = this.mergeServerChanges(
          updatedAccounts,
          updatedCategories,
          updatedTransactions,
          serverChanges
        );
        
        updatedAccounts = merged.accounts;
        updatedCategories = merged.categories;
        updatedTransactions = merged.transactions;
      }

      // Step 5: Update sync timestamp
      const newTimestamp = pushResult.currentTimestamp || Date.now();

      this.isSyncing = false;

      return {
        success: true,
        accounts: updatedAccounts.filter(a => !a.isDeleted),
        categories: updatedCategories,
        transactions: updatedTransactions.filter(t => !t.isDeleted),
        newQueue,
        newTimestamp,
        conflicts: pushResult.conflicts.length
      };
    } catch (error) {
      console.error('❌ Full sync error:', error);
      this.isSyncing = false;
      return null;
    }
  }

  /**
   * Check if sync is currently in progress
   */
  getIsSyncing(): boolean {
    return this.isSyncing;
  }
}

export const syncService = new SyncService();
export default syncService;
