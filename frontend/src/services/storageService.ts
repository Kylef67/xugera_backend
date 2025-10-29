import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Account, Category, Transaction } from '../contexts/DataContext';
import type { OfflineOperation } from '../types/offline';

// Storage keys
const KEYS = {
  ACCOUNTS: '@xugera:accounts',
  CATEGORIES: '@xugera:categories',
  TRANSACTIONS: '@xugera:transactions',
  LAST_SYNC_TIMESTAMP: '@xugera:lastSyncTimestamp',
  OFFLINE_QUEUE: '@xugera:offlineQueue',
  DEVICE_ID: '@xugera:deviceId',
};

class StorageService {
  // Generate or retrieve device ID
  async getDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(KEYS.DEVICE_ID);
      if (!deviceId) {
        // Generate a unique device ID
        deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        await AsyncStorage.setItem(KEYS.DEVICE_ID, deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return `device-fallback-${Date.now()}`;
    }
  }

  // Account storage
  async saveAccounts(accounts: Account[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
      console.log(`💾 Saved ${accounts.length} accounts to storage`);
    } catch (error) {
      console.error('Error saving accounts:', error);
      throw error;
    }
  }

  async getAccounts(): Promise<Account[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.ACCOUNTS);
      const accounts = data ? JSON.parse(data) : [];
      console.log(`📖 Loaded ${accounts.length} accounts from storage`);
      return accounts;
    } catch (error) {
      console.error('Error getting accounts:', error);
      return [];
    }
  }

  // Category storage
  async saveCategories(categories: Category[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
      console.log(`💾 Saved ${categories.length} categories to storage`);
    } catch (error) {
      console.error('Error saving categories:', error);
      throw error;
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CATEGORIES);
      const categories = data ? JSON.parse(data) : [];
      console.log(`📖 Loaded ${categories.length} categories from storage`);
      return categories;
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  // Transaction storage
  async saveTransactions(transactions: Transaction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
      console.log(`💾 Saved ${transactions.length} transactions to storage`);
    } catch (error) {
      console.error('Error saving transactions:', error);
      throw error;
    }
  }

  async getTransactions(): Promise<Transaction[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
      const transactions = data ? JSON.parse(data) : [];
      console.log(`📖 Loaded ${transactions.length} transactions from storage`);
      return transactions;
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  // Sync timestamp storage
  async saveLastSyncTimestamp(timestamp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.LAST_SYNC_TIMESTAMP, timestamp.toString());
      console.log(`💾 Saved last sync timestamp: ${new Date(timestamp).toISOString()}`);
    } catch (error) {
      console.error('Error saving sync timestamp:', error);
      throw error;
    }
  }

  async getLastSyncTimestamp(): Promise<number> {
    try {
      const data = await AsyncStorage.getItem(KEYS.LAST_SYNC_TIMESTAMP);
      const timestamp = data ? parseInt(data, 10) : 0;
      console.log(`📖 Loaded last sync timestamp: ${timestamp ? new Date(timestamp).toISOString() : 'never'}`);
      return timestamp;
    } catch (error) {
      console.error('Error getting sync timestamp:', error);
      return 0;
    }
  }

  // Offline queue storage
  async saveOfflineQueue(queue: OfflineOperation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
      console.log(`💾 Saved ${queue.length} operations to offline queue`);
    } catch (error) {
      console.error('Error saving offline queue:', error);
      throw error;
    }
  }

  async getOfflineQueue(): Promise<OfflineOperation[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.OFFLINE_QUEUE);
      const queue = data ? JSON.parse(data) : [];
      console.log(`📖 Loaded ${queue.length} operations from offline queue`);
      return queue;
    } catch (error) {
      console.error('Error getting offline queue:', error);
      return [];
    }
  }

  async clearOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify([]));
      console.log('🗑️  Cleared offline queue');
    } catch (error) {
      console.error('Error clearing offline queue:', error);
      throw error;
    }
  }

  // Save all data at once (for efficiency)
  async saveAllData(
    accounts: Account[],
    categories: Category[],
    transactions: Transaction[]
  ): Promise<void> {
    try {
      await Promise.all([
        this.saveAccounts(accounts),
        this.saveCategories(categories),
        this.saveTransactions(transactions),
      ]);
      console.log('💾 Saved all data to storage');
    } catch (error) {
      console.error('Error saving all data:', error);
      throw error;
    }
  }

  // Load all data at once (for efficiency)
  async loadAllData(): Promise<{
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
  }> {
    try {
      const [accounts, categories, transactions] = await Promise.all([
        this.getAccounts(),
        this.getCategories(),
        this.getTransactions(),
      ]);
      console.log('📖 Loaded all data from storage');
      return { accounts, categories, transactions };
    } catch (error) {
      console.error('Error loading all data:', error);
      return { accounts: [], categories: [], transactions: [] };
    }
  }

  // Clear all data (for testing or reset)
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        KEYS.ACCOUNTS,
        KEYS.CATEGORIES,
        KEYS.TRANSACTIONS,
        KEYS.LAST_SYNC_TIMESTAMP,
        KEYS.OFFLINE_QUEUE,
      ]);
      console.log('🗑️  Cleared all data from storage');
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }
}

export const storageService = new StorageService();
export default storageService;
