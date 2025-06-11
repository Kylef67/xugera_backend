import { synchronize } from '@nozbe/watermelondb/sync';
import NetInfo from '@react-native-community/netinfo';
import { database } from '../database';

const API_BASE_URL = 'http://localhost:3000'; // Your backend URL

interface SyncChanges {
  created: any[];
  updated: any[];
  deleted: string[];
}

export class SyncService {
  private isOnline: boolean = false;
  private syncInProgress: boolean = false;

  constructor() {
    this.initNetworkListener();
  }

  private initNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected || false;
      
      // Auto-sync when coming back online
      if (wasOffline && this.isOnline) {
        this.syncData();
      }
    });
  }

  async syncData(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;

    try {
      await synchronize({
        database,
        pullChanges: async ({ lastPulledAt, schemaVersion }) => {
          // Fetch data from server that was updated after lastPulledAt
          const response = await fetch(
            `${API_BASE_URL}/sync/pull?lastPulledAt=${lastPulledAt || 0}&schemaVersion=${schemaVersion}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Pull failed: ${response.statusText}`);
          }

          const { changes, timestamp } = await response.json();
          return { changes, timestamp };
        },

        pushChanges: async ({ changes }) => {
          // Send local changes to server
          const response = await fetch(`${API_BASE_URL}/sync/push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              changes,
            }),
          });

          if (!response.ok) {
            throw new Error(`Push failed: ${response.statusText}`);
          }
        },
      });

      console.log('✅ Sync completed successfully');
    } catch (error) {
      console.error('❌ Sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Convert WatermelonDB records to API format
  private convertToAPIFormat(record: any, tableName: string): any {
    const apiRecord: any = {
      id: record.id,
    };

    switch (tableName) {
      case 'transactions':
        return {
          ...apiRecord,
          transactionDate: new Date(record.transactionDate),
          fromAccount: record.fromAccount,
          toAccount: record.toAccount,
          category: record.category,
          amount: record.amount,
        };
      
      case 'categories':
        return {
          ...apiRecord,
          name: record.name,
          description: record.description,
          icon: record.icon,
          parent: record.parent,
          createdAt: new Date(record.createdAt),
          updatedAt: new Date(record.updatedAt),
        };
      
      case 'accounts':
        return {
          ...apiRecord,
          name: record.name,
          description: record.description,
          createdAt: new Date(record.createdAt),
          updatedAt: new Date(record.updatedAt),
        };
      
      default:
        return apiRecord;
    }
  }

  // Convert API records to WatermelonDB format
  private convertFromAPIFormat(apiRecord: any, tableName: string): any {
    const record: any = {
      id: apiRecord._id || apiRecord.id,
    };

    switch (tableName) {
      case 'transactions':
        return {
          ...record,
          transaction_date: new Date(apiRecord.transactionDate).getTime(),
          from_account: apiRecord.fromAccount,
          to_account: apiRecord.toAccount,
          category: apiRecord.category,
          amount: apiRecord.amount,
        };
      
      case 'categories':
        return {
          ...record,
          name: apiRecord.name,
          description: apiRecord.description,
          icon: apiRecord.icon,
          parent: apiRecord.parent,
          created_at: new Date(apiRecord.createdAt).getTime(),
          updated_at: new Date(apiRecord.updatedAt).getTime(),
        };
      
      case 'accounts':
        return {
          ...record,
          name: apiRecord.name,
          description: apiRecord.description,
          created_at: new Date(apiRecord.createdAt).getTime(),
          updated_at: new Date(apiRecord.updatedAt).getTime(),
        };
      
      default:
        return record;
    }
  }

  async forceSyncNow(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    return this.syncData();
  }

  getConnectionStatus(): boolean {
    return this.isOnline;
  }

  isSyncing(): boolean {
    return this.syncInProgress;
  }
}

export const syncService = new SyncService(); 