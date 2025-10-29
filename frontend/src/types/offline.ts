// Offline operation types for queue management

export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';
export type ResourceType = 'account' | 'category' | 'transaction';

export interface OfflineOperation {
  id: string; // Local operation ID (UUID)
  operationId: string; // Same as id, for backend compatibility
  type: OperationType;
  resource: ResourceType;
  data: any; // The actual data being created/updated/deleted
  localTimestamp: number; // When the operation was queued
  retryCount: number;
  deviceId?: string;
}

export interface SyncResult {
  success: boolean;
  accepted: Array<{ operationId: string; id: string }>;
  conflicts: Array<{
    operationId: string;
    reason: string;
    serverRecord: any;
    serverUpdatedAt?: number;
    localTimestamp?: number;
  }>;
  rejected: Array<{ operationId: string; error: string }>;
  serverData: {
    accounts: any[];
    categories: any[];
    transactions: any[];
  };
  currentTimestamp?: number;
}

export interface SyncChangesResponse {
  accounts: any[];
  categories: any[];
  transactions: any[];
  currentTimestamp: number;
  syncedAt: string;
}
