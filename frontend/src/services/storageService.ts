import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Account {
  id: string;
  serverId?: string; // Server ID for synced accounts
  name: string;
  description: string;
  balance: number;
  type: 'debit' | 'credit' | 'wallet';
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  order: number; // Position for drag-and-drop sorting
}

export interface Transaction {
  id: string;
  serverId?: string; // Server ID for synced transactions
  fromAccount: string;
  toAccount?: string;
  category?: string;
  amount: number;
  transactionDate: string;
  description?: string;
  synced: boolean;
}

class StorageService {
  private readonly ACCOUNTS_KEY = 'app_accounts';
  private readonly TRANSACTIONS_KEY = 'app_transactions';
  private readonly SYNC_TIME_KEY = 'last_sync_time';
  private readonly ID_MAPPING_KEY = 'id_mapping'; // Maps local IDs to server IDs

  // Generate simple UUID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ID Mapping management
  async getIdMapping(): Promise<Record<string, string>> {
    try {
      const data = await AsyncStorage.getItem(this.ID_MAPPING_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting ID mapping:', error);
      return {};
    }
  }

  async setIdMapping(mapping: Record<string, string>): Promise<void> {
    try {
      await AsyncStorage.setItem(this.ID_MAPPING_KEY, JSON.stringify(mapping));
    } catch (error) {
      console.error('Error setting ID mapping:', error);
    }
  }

  async mapLocalToServerId(localId: string, serverId: string): Promise<void> {
    const mapping = await this.getIdMapping();
    mapping[localId] = serverId;
    await this.setIdMapping(mapping);
  }

  // Accounts
  async getAccounts(): Promise<Account[]> {
    try {
      const data = await AsyncStorage.getItem(this.ACCOUNTS_KEY);
      const accounts = data ? JSON.parse(data) : [];
      
      // Ensure all accounts have an order field (migration for existing accounts)
      const accountsWithOrder = accounts.map((acc: any, index: number) => ({
        ...acc,
        order: acc.order !== undefined ? acc.order : index
      }));
      
      // Sort by order field
      return accountsWithOrder.sort((a: Account, b: Account) => a.order - b.order);
    } catch (error) {
      console.error('Error getting accounts:', error);
      return [];
    }
  }

  async saveAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'synced' | 'serverId' | 'order'>): Promise<Account> {
    try {
      const accounts = await this.getAccounts();
      
      // Calculate next order position
      const maxOrder = accounts.length > 0 ? Math.max(...accounts.map(acc => acc.order || 0)) : 0;
      
      const newAccount: Account = {
        ...account,
        id: this.generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: false,
        order: maxOrder + 1
      };
      
      accounts.push(newAccount);
      await AsyncStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(accounts));
      return newAccount;
    } catch (error) {
      console.error('Error saving account:', error);
      throw error;
    }
  }

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account | null> {
    try {
      const accounts = await this.getAccounts();
      const index = accounts.findIndex(acc => acc.id === id || acc.serverId === id);
      
      if (index === -1) return null;
      
      accounts[index] = {
        ...accounts[index],
        ...updates,
        updatedAt: new Date().toISOString(),
        synced: false // Mark as unsynced when updated
      };
      
      await AsyncStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(accounts));
      return accounts[index];
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  }

  async deleteAccount(id: string): Promise<boolean> {
    try {
      const accounts = await this.getAccounts();
      const filteredAccounts = accounts.filter(acc => acc.id !== id && acc.serverId !== id);
      await AsyncStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(filteredAccounts));
      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      return false;
    }
  }

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    try {
      const data = await AsyncStorage.getItem(this.TRANSACTIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  async saveTransaction(transaction: Omit<Transaction, 'id' | 'synced' | 'serverId'>): Promise<Transaction> {
    try {
      const transactions = await this.getTransactions();
      const newTransaction: Transaction = {
        ...transaction,
        id: this.generateId(),
        synced: false
      };
      
      transactions.push(newTransaction);
      await AsyncStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(transactions));
      return newTransaction;
    } catch (error) {
      console.error('Error saving transaction:', error);
      throw error;
    }
  }

  // Sync status
  async getLastSyncTime(): Promise<Date | null> {
    try {
      const time = await AsyncStorage.getItem(this.SYNC_TIME_KEY);
      return time ? new Date(time) : null;
    } catch (error) {
      console.error('Error getting sync time:', error);
      return null;
    }
  }

  async setLastSyncTime(time: Date): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SYNC_TIME_KEY, time.toISOString());
    } catch (error) {
      console.error('Error setting sync time:', error);
    }
  }

  // Get unsynced data
  async getUnsyncedAccounts(): Promise<Account[]> {
    const accounts = await this.getAccounts();
    return accounts.filter(acc => !acc.synced);
  }

  async getUnsyncedTransactions(): Promise<Transaction[]> {
    const transactions = await this.getTransactions();
    return transactions.filter(tr => !tr.synced);
  }

  // Mark as synced and update server IDs
  async markAccountsSynced(localToServerIdMap: Record<string, string>): Promise<void> {
    try {
      console.log('🏷️ markAccountsSynced called with mapping:', JSON.stringify(localToServerIdMap, null, 2));
      const accounts = await this.getAccounts();
      console.log('📋 Current accounts before marking synced:', JSON.stringify(
        accounts.map(a => ({ id: a.id, name: a.name, synced: a.synced, serverId: a.serverId })), 
        null, 2
      ));
      
      const updatedAccounts = accounts.map(acc => {
        if (localToServerIdMap[acc.id]) {
          console.log(`🔄 Updating account ${acc.id} (${acc.name}): serverId=${localToServerIdMap[acc.id]}, synced=true`);
          return {
            ...acc,
            serverId: localToServerIdMap[acc.id],
            synced: true
          };
        }
        return acc;
      });
      
      console.log('📋 Accounts after mapping:', JSON.stringify(
        updatedAccounts.map(a => ({ id: a.id, name: a.name, synced: a.synced, serverId: a.serverId })), 
        null, 2
      ));
      await AsyncStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
      console.log('💾 Saved updated accounts to storage');
    } catch (error) {
      console.error('Error marking accounts as synced:', error);
    }
  }

  async markTransactionsSynced(localToServerIdMap: Record<string, string>): Promise<void> {
    try {
      const transactions = await this.getTransactions();
      const updatedTransactions = transactions.map(tr => {
        if (localToServerIdMap[tr.id]) {
          return {
            ...tr,
            serverId: localToServerIdMap[tr.id],
            synced: true
          };
        }
        return tr;
      });
      await AsyncStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(updatedTransactions));
    } catch (error) {
      console.error('Error marking transactions as synced:', error);
    }
  }

  // Improved merge with proper conflict resolution
  async mergeServerAccounts(serverAccounts: any[]): Promise<void> {
    try {
      console.log('🔄 mergeServerAccounts called with server accounts:', JSON.stringify(
        serverAccounts.map(acc => ({ _id: acc._id, name: acc.name })), 
        null, 2
      ));
      
      const localAccounts = await this.getAccounts();
      console.log('📱 Local accounts before merge:', JSON.stringify(
        localAccounts.map(acc => ({ id: acc.id, name: acc.name, synced: acc.synced, serverId: acc.serverId })), 
        null, 2
      ));
      
      const serverAccountsNormalized: Account[] = serverAccounts.map((acc, index) => ({
        id: acc._id || acc.id,
        serverId: acc._id || acc.id,
        name: acc.name,
        description: acc.description || '',
        balance: 0, // Calculate from transactions
        type: 'debit', // Default
        icon: 'credit-card',
        color: '#4CAF50',
        createdAt: acc.createdAt || new Date().toISOString(),
        updatedAt: acc.updatedAt || new Date().toISOString(),
        synced: true,
        order: acc.order || (index + 1000) // Use server order or assign high order for new items
      }));

      console.log('🌐 Normalized server accounts:', JSON.stringify(
        serverAccountsNormalized.map(acc => ({ id: acc.id, serverId: acc.serverId, name: acc.name })), 
        null, 2
      ));

      // Create a map of server accounts by their ID
      const serverAccountMap = new Map();
      serverAccountsNormalized.forEach(acc => {
        serverAccountMap.set(acc.serverId, acc);
      });

      console.log('🗺️ Server account map keys:', JSON.stringify(Array.from(serverAccountMap.keys()), null, 2));

      // Process local accounts
      const mergedAccounts: Account[] = [];
      const processedServerIds = new Set();

      console.log('🔄 Processing local accounts...');
      for (const localAccount of localAccounts) {
        console.log(`🏷️ Processing local account:`, JSON.stringify({
          id: localAccount.id,
          name: localAccount.name,
          serverId: localAccount.serverId,
          synced: localAccount.synced
        }, null, 2));
        
        if (localAccount.serverId && serverAccountMap.has(localAccount.serverId)) {
          console.log(`✅ Found matching server account for ${localAccount.id}`);
          // This account exists on server, check for conflicts
          const serverAccount = serverAccountMap.get(localAccount.serverId);
          
          // Last-write-wins: compare updatedAt timestamps
          const localUpdated = new Date(localAccount.updatedAt);
          const serverUpdated = new Date(serverAccount.updatedAt);
          
          console.log(`⏰ Timestamp comparison:`, JSON.stringify({
            local: localUpdated.toISOString(),
            server: serverUpdated.toISOString(),
            localIsNewer: localUpdated > serverUpdated
          }, null, 2));
          
          if (localUpdated > serverUpdated) {
            // Local is newer, keep local version but mark as unsynced to push changes
            console.log(`📱 Local is newer, keeping local version of ${localAccount.name}`);
            mergedAccounts.push({
              ...localAccount,
              synced: false
            });
          } else {
            // Server is newer or same, but preserve local order if account was unsynced
            console.log(`🌐 Server is newer/same, using server version of ${serverAccount.name}`);
            mergedAccounts.push({
              ...serverAccount,
              id: localAccount.id, // Keep local ID
              order: localAccount.synced ? serverAccount.order : localAccount.order, // Preserve local order if account is unsynced
              synced: localAccount.synced // Keep local sync status
            });
          }
          processedServerIds.add(localAccount.serverId);
        } else if (!localAccount.synced) {
          // Local-only account that hasn't been synced yet
          console.log(`📱 Keeping unsynced local account: ${localAccount.name}`);
          mergedAccounts.push(localAccount);
        } else {
          console.log(`🗑️ Skipping synced local account with no server match: ${localAccount.name}`);
        }
        // Skip local accounts that are synced but no longer exist on server (deleted)
      }

      console.log('🔄 Adding new server accounts...');
      // Add new server accounts that don't exist locally
      serverAccountsNormalized.forEach(serverAccount => {
        if (!processedServerIds.has(serverAccount.serverId)) {
          console.log(`➕ Adding new server account: ${serverAccount.name}`);
          mergedAccounts.push({
            ...serverAccount,
            id: this.generateId() // Generate new local ID
          });
        }
      });
      
      console.log('📋 Final merged accounts:', JSON.stringify(
        mergedAccounts.map(acc => ({ id: acc.id, name: acc.name, synced: acc.synced, serverId: acc.serverId, order: acc.order })), 
        null, 2
      ));
      
      // Sort by order before saving
      mergedAccounts.sort((a, b) => a.order - b.order);
      
      await AsyncStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(mergedAccounts));
      console.log('💾 Saved merged accounts to storage');
    } catch (error) {
      console.error('Error merging server accounts:', error);
    }
  }

  async mergeServerTransactions(serverTransactions: any[]): Promise<void> {
    try {
      const localTransactions = await this.getTransactions();
      const serverTransactionsNormalized: Transaction[] = serverTransactions.map(tr => ({
        id: tr._id || tr.id,
        serverId: tr._id || tr.id,
        fromAccount: tr.fromAccount,
        toAccount: tr.toAccount,
        category: tr.category,
        amount: tr.amount,
        transactionDate: tr.transactionDate,
        description: tr.description,
        synced: true
      }));

      // Similar logic as accounts - implement last-write-wins
      const serverTransactionMap = new Map();
      serverTransactionsNormalized.forEach(tr => {
        serverTransactionMap.set(tr.serverId, tr);
      });

      const mergedTransactions: Transaction[] = [];
      const processedServerIds = new Set();

      for (const localTransaction of localTransactions) {
        if (localTransaction.serverId && serverTransactionMap.has(localTransaction.serverId)) {
          const serverTransaction = serverTransactionMap.get(localTransaction.serverId);
          mergedTransactions.push({
            ...serverTransaction,
            id: localTransaction.id,
            synced: true
          });
          processedServerIds.add(localTransaction.serverId);
        } else if (!localTransaction.synced) {
          mergedTransactions.push(localTransaction);
        }
      }

      serverTransactionsNormalized.forEach(serverTransaction => {
        if (!processedServerIds.has(serverTransaction.serverId)) {
          mergedTransactions.push({
            ...serverTransaction,
            id: this.generateId()
          });
        }
      });
      
      await AsyncStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(mergedTransactions));
    } catch (error) {
      console.error('Error merging server transactions:', error);
    }
  }

  async updateAccountOrder(reorderedAccounts: Account[]): Promise<void> {
    try {
      console.log('🔄 updateAccountOrder called with:', JSON.stringify(
        reorderedAccounts.map((acc, index) => ({ id: acc.id, name: acc.name, oldOrder: acc.order, newOrder: index })), 
        null, 2
      ));
      
      // Update order for each account
      const accountsWithNewOrder = reorderedAccounts.map((acc, index) => ({
        ...acc,
        order: index,
        updatedAt: new Date().toISOString(),
        synced: false // Mark as unsynced since order changed
      }));
      
      console.log('💾 Saving accounts with new order:', JSON.stringify(
        accountsWithNewOrder.map(acc => ({ id: acc.id, name: acc.name, order: acc.order, synced: acc.synced })), 
        null, 2
      ));
      
      await AsyncStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(accountsWithNewOrder));
      console.log('✅ Updated account order');
    } catch (error) {
      console.error('Error updating account order:', error);
      throw error;
    }
  }
}

export const storageService = new StorageService(); 