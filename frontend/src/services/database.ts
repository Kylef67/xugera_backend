import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Account } from '../contexts/DataContext';
import { generateObjectId } from '../utils/objectId';

export interface SyncableAccount extends Account {
  updatedAt: number;
  serverUpdatedAt?: number;
  isDeleted?: boolean;
  order?: number; // Added for ordering
}

interface DatabaseInterface {
  initialize(): Promise<void>;
  isReady(): boolean;
  getAllAccounts(includeDeleted?: boolean): Promise<SyncableAccount[]>;
  getAccountById(id: string): Promise<SyncableAccount | null>;
  saveAccount(account: SyncableAccount): Promise<void>;
  deleteAccount(id: string): Promise<void>;
  getUnsyncedAccounts(): Promise<SyncableAccount[]>;
  updateServerTimestamp(id: string, serverUpdatedAt: number): Promise<void>;
  getLastSyncTimestamp(): Promise<number>;
  setLastSyncTimestamp(timestamp: number): Promise<void>;
  clearAllData(): Promise<void>;
  updateAccountOrder(accountId: string, newOrder: number): Promise<void>;
  updateAccountsOrder(reorderedAccounts: {id: string, order: number}[]): Promise<void>;
}

class AsyncStorageDatabaseService implements DatabaseInterface {
  private isInitialized: boolean = false;
  private readonly ACCOUNTS_KEY = 'xugera_accounts';
  private readonly SYNC_METADATA_KEY = 'xugera_sync_metadata';

  async initialize(): Promise<void> {
    this.isInitialized = true;
    // Run migration to fix invalid ObjectIds
    await this.migrateInvalidObjectIds();
    // Initialize account orders if needed
    await this.initializeAccountOrders();
  }
  
  private async initializeAccountOrders(): Promise<void> {
    try {
      const accountsJson = await AsyncStorage.getItem(this.ACCOUNTS_KEY);
      if (!accountsJson) return;
      
      const accounts = JSON.parse(accountsJson) as SyncableAccount[];
      let needsUpdate = false;
      
      // Check if any accounts are missing the order field
      const accountsMissingOrder = accounts.some(account => account.order === undefined);
      
      if (accountsMissingOrder) {
        // Sort accounts by updatedAt to maintain consistent ordering
        const sortedAccounts = [...accounts].sort((a, b) => b.updatedAt - a.updatedAt);
        
        // Assign order values
        for (let i = 0; i < sortedAccounts.length; i++) {
          const account = sortedAccounts[i];
          const originalIndex = accounts.findIndex(a => a.id === account.id);
          if (originalIndex !== -1) {
            accounts[originalIndex].order = i;
            needsUpdate = true;
          }
        }
        
        if (needsUpdate) {
          await AsyncStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(accounts));
          console.log('Migration completed: Account orders have been initialized');
        }
      }
    } catch (error) {
      console.error('Error during account order initialization:', error);
    }
  }

  private async migrateInvalidObjectIds(): Promise<void> {
    try {
      const accountsJson = await AsyncStorage.getItem(this.ACCOUNTS_KEY);
      if (!accountsJson) return;
      
      const accounts = JSON.parse(accountsJson) as SyncableAccount[];
      let needsUpdate = false;
      
      // Check for accounts with invalid ObjectId format
      const validObjectIdRegex = /^[0-9a-fA-F]{24}$/;
      
      for (const account of accounts) {
        if (!validObjectIdRegex.test(account.id)) {
          // Generate new ObjectId for invalid accounts
          account.id = generateObjectId();
          account.updatedAt = Date.now();
          needsUpdate = true;
          console.log(`Migrated account with invalid ID to new ObjectId: ${account.id}`);
        }
      }
      
      if (needsUpdate) {
        await AsyncStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(accounts));
        console.log('Migration completed: Invalid ObjectIds have been fixed');
      }
    } catch (error) {
      console.error('Error during ObjectId migration:', error);
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  async getAllAccounts(includeDeleted: boolean = false): Promise<SyncableAccount[]> {
    try {
      const accountsJson = await AsyncStorage.getItem(this.ACCOUNTS_KEY);
      if (!accountsJson) return [];
      
      const accounts = JSON.parse(accountsJson) as SyncableAccount[];
      if (includeDeleted) {
        // Sort by order first, then by updatedAt as a fallback
        return accounts.sort((a, b) => {
          // If both have order, sort by order
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          // If only one has order, prioritize the one with order
          if (a.order !== undefined) return -1;
          if (b.order !== undefined) return 1;
          // Default sort by updatedAt
          return b.updatedAt - a.updatedAt;
        });
      }
      return accounts
        .filter(account => !account.isDeleted)
        .sort((a, b) => {
          // If both have order, sort by order
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          // If only one has order, prioritize the one with order
          if (a.order !== undefined) return -1;
          if (b.order !== undefined) return 1;
          // Default sort by updatedAt
          return b.updatedAt - a.updatedAt;
        });
    } catch (error) {
      console.error('Error getting accounts from AsyncStorage:', error);
      return [];
    }
  }

  async getAccountById(id: string): Promise<SyncableAccount | null> {
    try {
      const accounts = await this.getAllAccounts(true); // Include deleted accounts
      return accounts.find(account => account.id === id) || null;
    } catch (error) {
      console.error('Error getting account by ID:', error);
      return null;
    }
  }

  async saveAccount(account: SyncableAccount): Promise<void> {
    try {
      // Get all accounts including deleted ones for storage
      const accountsJson = await AsyncStorage.getItem(this.ACCOUNTS_KEY);
      const accounts = accountsJson ? JSON.parse(accountsJson) as SyncableAccount[] : [];
      
      const existingIndex = accounts.findIndex(a => a.id === account.id);
      
      // Generate a new timestamp that's guaranteed to be newer than any previous timestamp
      const now = Date.now();
      
      const accountWithTimestamp = {
        ...account,
        // If account already has an updatedAt timestamp, use the newer one
        // This ensures we don't accidentally set an older timestamp during sync
        updatedAt: Math.max(now, account.updatedAt || 0)
      };
      
      if (existingIndex >= 0) {
        // For existing accounts, preserve serverUpdatedAt if not provided
        if (!accountWithTimestamp.serverUpdatedAt && accounts[existingIndex].serverUpdatedAt) {
          accountWithTimestamp.serverUpdatedAt = accounts[existingIndex].serverUpdatedAt;
        }
        accounts[existingIndex] = accountWithTimestamp;
      } else {
        accounts.push(accountWithTimestamp);
      }
      
      await AsyncStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(accounts));
      console.log(`Account saved with name: ${account.name}, updatedAt: ${accountWithTimestamp.updatedAt}, serverUpdatedAt: ${accountWithTimestamp.serverUpdatedAt || 'none'}`);
    } catch (error) {
      console.error('Error saving account to AsyncStorage:', error);
      throw error;
    }
  }

  async deleteAccount(id: string): Promise<void> {
    try {
      // Get all accounts including deleted ones for storage
      const accountsJson = await AsyncStorage.getItem(this.ACCOUNTS_KEY);
      const accounts = accountsJson ? JSON.parse(accountsJson) as SyncableAccount[] : [];
      
      const accountIndex = accounts.findIndex(a => a.id === id);
      
      if (accountIndex >= 0) {
        accounts[accountIndex] = {
          ...accounts[accountIndex],
          isDeleted: true,
          updatedAt: Date.now()
        };
        await AsyncStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(accounts));
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  async getUnsyncedAccounts(): Promise<SyncableAccount[]> {
    try {
      const accountsJson = await AsyncStorage.getItem(this.ACCOUNTS_KEY);
      if (!accountsJson) return [];
      
      const accounts = JSON.parse(accountsJson) as SyncableAccount[];
      return accounts.filter(account => account.updatedAt > (account.serverUpdatedAt || 0));
    } catch (error) {
      console.error('Error getting unsynced accounts:', error);
      return [];
    }
  }

  async updateServerTimestamp(id: string, serverUpdatedAt: number): Promise<void> {
    try {
      const accountsJson = await AsyncStorage.getItem(this.ACCOUNTS_KEY);
      if (!accountsJson) return;
      
      const accounts = JSON.parse(accountsJson) as SyncableAccount[];
      const accountIndex = accounts.findIndex(a => a.id === id);
      
      if (accountIndex >= 0) {
        accounts[accountIndex].serverUpdatedAt = serverUpdatedAt;
        await AsyncStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(accounts));
      }
    } catch (error) {
      console.error('Error updating server timestamp:', error);
      throw error;
    }
  }

  async updateAccountOrder(accountId: string, newOrder: number): Promise<void> {
    try {
      const accountsJson = await AsyncStorage.getItem(this.ACCOUNTS_KEY);
      if (!accountsJson) return;
      
      const accounts = JSON.parse(accountsJson) as SyncableAccount[];
      const accountIndex = accounts.findIndex(a => a.id === accountId);
      
      if (accountIndex >= 0) {
        accounts[accountIndex].order = newOrder;
        accounts[accountIndex].updatedAt = Date.now();
        await AsyncStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(accounts));
        console.log(`Account ${accountId} order updated to ${newOrder}`);
      }
    } catch (error) {
      console.error('Error updating account order:', error);
      throw error;
    }
  }

  async updateAccountsOrder(reorderedAccounts: {id: string, order: number}[]): Promise<void> {
    try {
      const accountsJson = await AsyncStorage.getItem(this.ACCOUNTS_KEY);
      if (!accountsJson) return;
      
      const accounts = JSON.parse(accountsJson) as SyncableAccount[];
      const now = Date.now();
      
      // Update order for each account in the reordered list
      let updated = false;
      for (const { id, order } of reorderedAccounts) {
        const accountIndex = accounts.findIndex(a => a.id === id);
        if (accountIndex >= 0) {
          accounts[accountIndex].order = order;
          accounts[accountIndex].updatedAt = now;
          updated = true;
        }
      }
      
      if (updated) {
        await AsyncStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(accounts));
        console.log(`Updated order for ${reorderedAccounts.length} accounts`);
      }
    } catch (error) {
      console.error('Error updating accounts order:', error);
      throw error;
    }
  }

  async getLastSyncTimestamp(): Promise<number> {
    try {
      const metadataJson = await AsyncStorage.getItem(this.SYNC_METADATA_KEY);
      if (!metadataJson) return 0;
      
      const metadata = JSON.parse(metadataJson);
      return metadata.lastSyncTimestamp || 0;
    } catch (error) {
      console.error('Error getting last sync timestamp:', error);
      return 0;
    }
  }

  async setLastSyncTimestamp(timestamp: number): Promise<void> {
    try {
      const metadataJson = await AsyncStorage.getItem(this.SYNC_METADATA_KEY);
      const metadata = metadataJson ? JSON.parse(metadataJson) : {};
      
      metadata.lastSyncTimestamp = timestamp;
      await AsyncStorage.setItem(this.SYNC_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('Error setting last sync timestamp:', error);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.ACCOUNTS_KEY);
      await AsyncStorage.removeItem(this.SYNC_METADATA_KEY);
    } catch (error) {
      console.error('Error clearing AsyncStorage data:', error);
      throw error;
    }
  }
}

class SQLiteDatabaseService implements DatabaseInterface {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    this.db = await SQLite.openDatabaseAsync('xugera_offline.db');
    
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        balance REAL NOT NULL,
        type TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        description TEXT,
        includeInTotal INTEGER DEFAULT 1,
        creditLimit REAL,
        updatedAt INTEGER NOT NULL,
        serverUpdatedAt INTEGER,
        isDeleted INTEGER DEFAULT 0,
        "order" INTEGER
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    
    this.isInitialized = true;
    
    // Run migrations
    await this.migrateAddOrderColumn();
    await this.migrateInvalidObjectIds();
  }
  
  private async migrateAddOrderColumn(): Promise<void> {
    try {
      if (!this.isReady()) return;
      
      // Check if the order column exists
      const tableInfo = await this.db!.getAllAsync("PRAGMA table_info(accounts)");
      const hasOrderColumn = tableInfo.some((column: any) => column.name === 'order');
      
      if (!hasOrderColumn) {
        // Add the order column if it doesn't exist
        await this.db!.execAsync(`ALTER TABLE accounts ADD COLUMN "order" INTEGER;`);
        console.log('Migration: Added "order" column to accounts table');
        
        // Set initial order based on current sorting (updatedAt)
        const accounts = await this.getAllAccounts();
        
        // Use transaction for better performance
        await this.db!.execAsync('BEGIN TRANSACTION');
        
        try {
          // Use a for loop instead of forEach for proper async handling
          for (let i = 0; i < accounts.length; i++) {
            await this.db!.runAsync(
              `UPDATE accounts SET "order" = ? WHERE id = ?`,
              [i, accounts[i].id]
            );
          }
          
          await this.db!.execAsync('COMMIT');
          console.log('Migration: Set initial order values for accounts');
        } catch (error) {
          await this.db!.execAsync('ROLLBACK');
          console.error('Error during order column migration transaction:', error);
        }
      }
    } catch (error) {
      console.error('Error during order column migration:', error);
      if (this.db) {
        await this.db.execAsync('ROLLBACK').catch(e => console.error('Error rolling back transaction:', e));
      }
    }
  }

  private async migrateInvalidObjectIds(): Promise<void> {
    try {
      if (!this.isReady()) return;
      
      const accounts = await this.getAllAccounts();
      const validObjectIdRegex = /^[0-9a-fA-F]{24}$/;
      
      for (const account of accounts) {
        if (!validObjectIdRegex.test(account.id)) {
          // Generate new ObjectId for invalid accounts
          const newId = generateObjectId();
          const timestamp = Date.now();
          
          // Update the account with new ObjectId
          await this.db!.runAsync(`
            UPDATE accounts 
            SET id = ?, updatedAt = ?
            WHERE id = ?
          `, [newId, timestamp, account.id]);
          
          console.log(`Migrated account with invalid ID ${account.id} to new ObjectId: ${newId}`);
        }
      }
      
      console.log('Migration completed: Invalid ObjectIds have been fixed');
    } catch (error) {
      console.error('Error during ObjectId migration:', error);
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }

  async getAllAccounts(includeDeleted: boolean = false): Promise<SyncableAccount[]> {
    if (!this.isReady()) throw new Error('Database not initialized');
    
    try {
      let query = `
        SELECT * FROM accounts
      `;
      
      if (!includeDeleted) {
        query += ` WHERE isDeleted = 0`;
      }
      
      query += ` ORDER BY "order" ASC, updatedAt DESC`;
      
      const result = await this.db!.getAllAsync<any>(query);
      
      return result.map(row => ({
        id: row.id,
        name: row.name,
        balance: row.balance,
        type: row.type,
        icon: row.icon,
        color: row.color,
        description: row.description,
        includeInTotal: Boolean(row.includeInTotal),
        creditLimit: row.creditLimit,
        order: row.order,
        updatedAt: row.updatedAt,
        serverUpdatedAt: row.serverUpdatedAt,
        isDeleted: Boolean(row.isDeleted)
      }));
    } catch (error) {
      console.error('Error getting accounts from SQLite:', error);
      return [];
    }
  }

  async getAccountById(id: string): Promise<SyncableAccount | null> {
    if (!this.isReady()) throw new Error('Database not initialized');
    
    const result = await this.db!.getFirstAsync(
      'SELECT * FROM accounts WHERE id = ?',
      [id]
    ) as any;
    
    if (!result) return null;
    
    return {
      id: result.id as string,
      name: result.name as string,
      balance: result.balance as number,
      type: result.type as 'debit' | 'credit' | 'wallet',
      icon: result.icon as string,
      color: result.color as string,
      description: result.description as string,
      includeInTotal: Boolean(result.includeInTotal),
      creditLimit: result.creditLimit as number,
      order: result.order as number,
      updatedAt: result.updatedAt as number,
      serverUpdatedAt: result.serverUpdatedAt as number,
      isDeleted: Boolean(result.isDeleted)
    };
  }

  async saveAccount(account: SyncableAccount): Promise<void> {
    if (!this.isReady()) throw new Error('Database not initialized');
    
    // Generate a new timestamp that's guaranteed to be newer than any previous timestamp
    const now = Date.now();
    
    // First, check if we need to preserve serverUpdatedAt from existing account
    let serverUpdatedAt = account.serverUpdatedAt;
    if (!serverUpdatedAt) {
      const existingAccount = await this.getAccountById(account.id);
      if (existingAccount?.serverUpdatedAt) {
        serverUpdatedAt = existingAccount.serverUpdatedAt;
      }
    }
    
    const accountWithTimestamp = {
      ...account,
      // If account already has an updatedAt timestamp, use the newer one
      updatedAt: Math.max(now, account.updatedAt || 0),
      serverUpdatedAt
    };
    
    await this.db!.runAsync(`
      INSERT OR REPLACE INTO accounts (
        id, name, balance, type, icon, color, description, 
        includeInTotal, creditLimit, updatedAt, serverUpdatedAt, isDeleted, "order"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      accountWithTimestamp.id,
      accountWithTimestamp.name,
      accountWithTimestamp.balance,
      accountWithTimestamp.type,
      accountWithTimestamp.icon,
      accountWithTimestamp.color,
      accountWithTimestamp.description || null,
      accountWithTimestamp.includeInTotal ? 1 : 0,
      accountWithTimestamp.creditLimit || null,
      accountWithTimestamp.updatedAt,
      accountWithTimestamp.serverUpdatedAt || null,
      accountWithTimestamp.isDeleted ? 1 : 0,
      accountWithTimestamp.order || null
    ]);
    
    console.log(`SQLite: Account saved with name: ${account.name}, updatedAt: ${accountWithTimestamp.updatedAt}, serverUpdatedAt: ${accountWithTimestamp.serverUpdatedAt || 'none'}`);
  }

  async deleteAccount(id: string): Promise<void> {
    if (!this.isReady()) throw new Error('Database not initialized');
    
    const timestamp = Date.now();
    await this.db!.runAsync(
      'UPDATE accounts SET isDeleted = 1, updatedAt = ? WHERE id = ?',
      [timestamp, id]
    );
  }

  async getUnsyncedAccounts(): Promise<SyncableAccount[]> {
    if (!this.isReady()) throw new Error('Database not initialized');
    
    const result = await this.db!.getAllAsync(`
      SELECT * FROM accounts 
      WHERE updatedAt > COALESCE(serverUpdatedAt, 0)
      ORDER BY updatedAt DESC
    `) as any[];
    
    return result.map((row: any) => ({
      id: row.id as string,
      name: row.name as string,
      balance: row.balance as number,
      type: row.type as 'debit' | 'credit' | 'wallet',
      icon: row.icon as string,
      color: row.color as string,
      description: row.description as string,
      includeInTotal: Boolean(row.includeInTotal),
      creditLimit: row.creditLimit as number,
      order: row.order as number,
      updatedAt: row.updatedAt as number,
      serverUpdatedAt: row.serverUpdatedAt as number,
      isDeleted: Boolean(row.isDeleted)
    }));
  }

  async updateServerTimestamp(id: string, serverUpdatedAt: number): Promise<void> {
    if (!this.isReady()) throw new Error('Database not initialized');
    
    await this.db!.runAsync(
      'UPDATE accounts SET serverUpdatedAt = ? WHERE id = ?',
      [serverUpdatedAt, id]
    );
  }

  async updateAccountOrder(accountId: string, newOrder: number): Promise<void> {
    if (!this.isReady()) throw new Error('Database not initialized');
    
    try {
      const now = Date.now();
      await this.db!.runAsync(
        `UPDATE accounts SET "order" = ?, updatedAt = ? WHERE id = ?`,
        [newOrder, now, accountId]
      );
      console.log(`Account ${accountId} order updated to ${newOrder}`);
    } catch (error) {
      console.error('Error updating account order:', error);
      throw error;
    }
  }

  async updateAccountsOrder(reorderedAccounts: {id: string, order: number}[]): Promise<void> {
    if (!this.db || reorderedAccounts.length === 0) return;
    
    try {
      // Use the correct transaction method
      await this.db.execAsync('BEGIN TRANSACTION');
      
      const now = Date.now();
      for (const { id, order } of reorderedAccounts) {
        await this.db.runAsync(
          `UPDATE accounts SET "order" = ?, updatedAt = ? WHERE id = ?`,
          [order, now, id]
        );
      }
      
      await this.db.execAsync('COMMIT');
      console.log(`Updated order for ${reorderedAccounts.length} accounts`);
    } catch (error) {
      // Rollback on error
      if (this.db) {
        await this.db.execAsync('ROLLBACK');
      }
      console.error('Error updating accounts order:', error);
      throw error;
    }
  }

  async getLastSyncTimestamp(): Promise<number> {
    if (!this.isReady()) throw new Error('Database not initialized');
    
    const result = await this.db!.getFirstAsync(
      'SELECT value FROM sync_metadata WHERE key = ?',
      ['lastSyncTimestamp']
    ) as any;
    
    return result ? parseInt(result.value as string) : 0;
  }

  async setLastSyncTimestamp(timestamp: number): Promise<void> {
    if (!this.isReady()) throw new Error('Database not initialized');
    
    await this.db!.runAsync(`
      INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)
    `, ['lastSyncTimestamp', timestamp.toString()]);
  }

  async clearAllData(): Promise<void> {
    if (!this.isReady()) throw new Error('Database not initialized');
    
    await this.db!.runAsync('DELETE FROM accounts');
    await this.db!.runAsync('DELETE FROM sync_metadata');
  }
}

// Create platform-specific database service
const createDatabaseService = (): DatabaseInterface => {
  if (Platform.OS === 'web') {
    return new AsyncStorageDatabaseService();
  } else {
    return new SQLiteDatabaseService();
  }
};

export const databaseService = createDatabaseService(); 