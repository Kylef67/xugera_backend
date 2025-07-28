import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Account } from '../contexts/DataContext';

export interface SyncableAccount extends Account {
  updatedAt: number;
  serverUpdatedAt?: number;
  isDeleted?: boolean;
}

export interface DatabaseInterface {
  initialize(): Promise<void>;
  isReady(): boolean;
  getAllAccounts(): Promise<SyncableAccount[]>;
  getAccountById(id: string): Promise<SyncableAccount | null>;
  saveAccount(account: SyncableAccount): Promise<void>;
  deleteAccount(id: string): Promise<void>;
  getUnsyncedAccounts(): Promise<SyncableAccount[]>;
  updateServerTimestamp(id: string, timestamp: number): Promise<void>;
  getLastSyncTimestamp(): Promise<number>;
  setLastSyncTimestamp(timestamp: number): Promise<void>;
  clearAllData(): Promise<void>;
  resetDatabase(): Promise<void>;
}

class AsyncStorageDatabaseService implements DatabaseInterface {
  private isInitialized: boolean = false;
  private ACCOUNTS_KEY = 'xugera_accounts';
  private SYNC_METADATA_KEY = 'xugera_sync_metadata';

  async initialize(): Promise<void> {
    console.log('Initializing AsyncStorage database...');
    this.isInitialized = true;
    console.log('AsyncStorage database initialized');
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  async getAllAccounts(): Promise<SyncableAccount[]> {
    try {
      const accountsJson = await AsyncStorage.getItem(this.ACCOUNTS_KEY);
      if (!accountsJson) return [];
      
      const accounts = JSON.parse(accountsJson) as SyncableAccount[];
      return accounts.filter(account => !account.isDeleted).sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('Error getting accounts from AsyncStorage:', error);
      return [];
    }
  }

  async getAccountById(id: string): Promise<SyncableAccount | null> {
    const accounts = await this.getAllAccounts();
    return accounts.find(account => account.id === id) || null;
  }

  async saveAccount(account: SyncableAccount): Promise<void> {
    try {
      const accounts = await this.getAllAccounts();
      const existingIndex = accounts.findIndex(a => a.id === account.id);
      
      const accountWithTimestamp = {
        ...account,
        updatedAt: account.updatedAt || Date.now()
      };

      if (existingIndex >= 0) {
        accounts[existingIndex] = accountWithTimestamp;
      } else {
        accounts.push(accountWithTimestamp);
      }

      await AsyncStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (error) {
      console.error('Error saving account to AsyncStorage:', error);
      throw error;
    }
  }

  async deleteAccount(id: string): Promise<void> {
    try {
      const accounts = await this.getAllAccounts();
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
      console.error('Error deleting account from AsyncStorage:', error);
      throw error;
    }
  }

  async getUnsyncedAccounts(): Promise<SyncableAccount[]> {
    const accounts = await this.getAllAccounts();
    return accounts.filter(account => !account.serverUpdatedAt || account.updatedAt > account.serverUpdatedAt);
  }

  async updateServerTimestamp(id: string, timestamp: number): Promise<void> {
    try {
      const accounts = await this.getAllAccounts();
      const accountIndex = accounts.findIndex(a => a.id === id);
      
      if (accountIndex >= 0) {
        accounts[accountIndex].serverUpdatedAt = timestamp;
        await AsyncStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(accounts));
      }
    } catch (error) {
      console.error('Error updating server timestamp in AsyncStorage:', error);
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
      const metadata = { lastSyncTimestamp: timestamp };
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

  async resetDatabase(): Promise<void> {
    // For AsyncStorage, reset is the same as clear
    await this.clearAllData();
  }
}

class SQLiteDatabaseService implements DatabaseInterface {
  private db: any = null;
  private isInitialized: boolean = false;
  private SQLite: any = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('Initializing SQLite database...');
    
    // Dynamically import SQLite only when needed
    if (!this.SQLite) {
      this.SQLite = await import('expo-sqlite' as any);
    }
    
    this.db = await this.SQLite.openDatabaseAsync('xugera_offline.db');
    
    // Create tables with proper schema
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
        isDeleted INTEGER DEFAULT 0
      );
    `);
    
    // Run migrations for existing databases
    console.log('Running database migrations...');
    
    // Add updatedAt column if it doesn't exist
    try {
      await this.db.execAsync(`ALTER TABLE accounts ADD COLUMN updatedAt INTEGER DEFAULT ${Date.now()};`);
      console.log('Added updatedAt column to existing accounts table');
    } catch (error) {
      console.log('updatedAt column already exists in accounts table');
    }
    
    // Add serverUpdatedAt column if it doesn't exist
    try {
      await this.db.execAsync(`ALTER TABLE accounts ADD COLUMN serverUpdatedAt INTEGER;`);
      console.log('Added serverUpdatedAt column to existing accounts table');
    } catch (error) {
      console.log('serverUpdatedAt column already exists in accounts table');
    }
    
    // Add isDeleted column if it doesn't exist
    try {
      await this.db.execAsync(`ALTER TABLE accounts ADD COLUMN isDeleted INTEGER DEFAULT 0;`);
      console.log('Added isDeleted column to existing accounts table');
    } catch (error) {
      console.log('isDeleted column already exists in accounts table');
    }
    
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    
    this.isInitialized = true;
    console.log('SQLite database initialized with migrations completed');
  }

  isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }

  async getAllAccounts(): Promise<SyncableAccount[]> {
    if (!this.isReady()) throw new Error('Database not initialized');
    
    const result = await this.db!.getAllAsync(`
      SELECT * FROM accounts WHERE isDeleted = 0 ORDER BY updatedAt DESC
    `) as any[];
    
    return result.map(row => ({
      id: row.id as string,
      name: row.name as string,
      balance: row.balance as number,
      type: row.type as 'debit' | 'credit' | 'wallet',
      icon: row.icon as string,
      color: row.color as string,
      description: row.description as string,
      includeInTotal: Boolean(row.includeInTotal),
      creditLimit: row.creditLimit as number,
      updatedAt: row.updatedAt as number,
      serverUpdatedAt: row.serverUpdatedAt as number,
      isDeleted: Boolean(row.isDeleted)
    }));
  }

  async getAccountById(id: string): Promise<SyncableAccount | null> {
    if (!this.isReady()) throw new Error('Database not initialized');
    
    const result = await this.db!.getFirstAsync(`
      SELECT * FROM accounts WHERE id = ? AND isDeleted = 0
    `, [id]) as any;
    
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
      updatedAt: result.updatedAt as number,
      serverUpdatedAt: result.serverUpdatedAt as number,
      isDeleted: Boolean(result.isDeleted)
    };
  }

  async saveAccount(account: SyncableAccount): Promise<void> {
    if (!this.isReady()) throw new Error('Database not initialized');
    
    const timestamp = account.updatedAt || Date.now();
    
    await this.db!.runAsync(`
      INSERT OR REPLACE INTO accounts (
        id, name, balance, type, icon, color, description, 
        includeInTotal, creditLimit, updatedAt, serverUpdatedAt, isDeleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      account.id,
      account.name,
      account.balance,
      account.type,
      account.icon,
      account.color,
      account.description || '',
      account.includeInTotal ? 1 : 0,
      account.creditLimit || 0,
      timestamp,
      account.serverUpdatedAt || null,
      account.isDeleted ? 1 : 0
    ]);
  }

  async deleteAccount(id: string): Promise<void> {
    if (!this.isReady()) throw new Error('Database not initialized');
    
    await this.db!.runAsync(`
      UPDATE accounts SET isDeleted = 1, updatedAt = ? WHERE id = ?
    `, [Date.now(), id]);
  }

  async getUnsyncedAccounts(): Promise<SyncableAccount[]> {
    if (!this.isReady()) throw new Error('Database not initialized');
    
    const result = await this.db!.getAllAsync(`
      SELECT * FROM accounts 
      WHERE serverUpdatedAt IS NULL OR updatedAt > serverUpdatedAt
      ORDER BY updatedAt DESC
    `) as any[];
    
    return result.map(row => ({
      id: row.id as string,
      name: row.name as string,
      balance: row.balance as number,
      type: row.type as 'debit' | 'credit' | 'wallet',
      icon: row.icon as string,
      color: row.color as string,
      description: row.description as string,
      includeInTotal: Boolean(row.includeInTotal),
      creditLimit: row.creditLimit as number,
      updatedAt: row.updatedAt as number,
      serverUpdatedAt: row.serverUpdatedAt as number,
      isDeleted: Boolean(row.isDeleted)
    }));
  }

  async updateServerTimestamp(id: string, timestamp: number): Promise<void> {
    if (!this.isReady()) throw new Error('Database not initialized');
    
    await this.db!.runAsync(`
      UPDATE accounts SET serverUpdatedAt = ? WHERE id = ?
    `, [timestamp, id]);
  }

  async getLastSyncTimestamp(): Promise<number> {
    if (!this.isReady()) throw new Error('Database not initialized');
    
    const result = await this.db!.getFirstAsync(`
      SELECT value FROM sync_metadata WHERE key = 'lastSyncTimestamp'
    `) as any;
    
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
    
    // Drop and recreate tables to ensure proper schema
    console.log('Clearing all data and resetting database schema...');
    
    try {
      await this.db!.runAsync('DROP TABLE IF EXISTS accounts');
      await this.db!.runAsync('DROP TABLE IF EXISTS sync_metadata');
      console.log('Tables dropped successfully');
      
      // Recreate tables with proper schema
      await this.db!.execAsync(`
        CREATE TABLE accounts (
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
          isDeleted INTEGER DEFAULT 0
        );
      `);
      console.log('Accounts table created successfully');
      
      await this.db!.execAsync(`
        CREATE TABLE sync_metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      console.log('Sync metadata table created successfully');
      
    } catch (error) {
      console.error('Error during database reset:', error);
      throw error;
    }
    
    console.log('Database schema reset completed');
  }

  async resetDatabase(): Promise<void> {
    console.log('Resetting entire SQLite database...');
    
    // Close current database
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
    this.isInitialized = false;
    
    // Delete the database file by opening with deleteAsync
    try {
      // Ensure SQLite is loaded
      if (!this.SQLite) {
        this.SQLite = await import('expo-sqlite' as any);
      }
      await this.SQLite.deleteDatabaseAsync('xugera_offline.db');
      console.log('Database file deleted successfully');
    } catch (error) {
      console.log('Database file deletion skipped (file may not exist)');
    }
    
    // Reinitialize
    await this.initialize();
    console.log('Database reset and reinitialized successfully');
  }
}

export const createDatabaseService = (): DatabaseInterface => {
  if (Platform.OS === 'web') {
    console.log('Using AsyncStorage database for web platform');
    return new AsyncStorageDatabaseService();
  } else {
    console.log('Using SQLite database for mobile platform');
    return new SQLiteDatabaseService();
  }
};

export const databaseService = createDatabaseService();
