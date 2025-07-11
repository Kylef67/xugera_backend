import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { databaseService, SyncableAccount } from '../services/database';
import { syncService, SyncResult } from '../services/syncService';
import NetInfo from '@react-native-community/netinfo';
import { generateObjectId } from '../utils/objectId';

export type Account = {
  id: string;
  name: string;
  balance: number;
  type: 'debit' | 'credit' | 'wallet';
  icon: string;
  color: string;
  description?: string;
  includeInTotal?: boolean;
  creditLimit?: number;
  order?: number;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'Income' | 'Expense';
  amount?: number;
  transactions?: number;
};

interface DataContextType {
  accounts: Account[];
  categories: Category[];
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  setAccounts: (accounts: Account[]) => void;
  setCategories: (categories: Category[]) => void;
  addAccount: (account: Account) => void;
  updateAccount: (account: Account) => void;
  deleteAccount: (id: string) => void;
  reorderAccounts: (reorderedAccounts: Account[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (category: Category) => void;
  syncData: (force?: boolean) => Promise<SyncResult>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const initialAccounts: Account[] = [
  {
    id: generateObjectId(),
    name: 'KOMOs Lorenz',
    balance: 74980.39,
    type: 'debit',
    icon: 'credit-card',
    color: '#FF4B8C',
  },
  {
    id: generateObjectId(),
    name: 'BPI Ana',
    balance: 16805.94,
    type: 'debit',
    icon: 'credit-card',
    color: '#4CAF50',
  },
  {
    id: generateObjectId(),
    name: 'Union Bank Lorenz',
    balance: 8992.90,
    type: 'debit',
    icon: 'credit-card',
    color: '#4CAF50',
  },
  {
    id: generateObjectId(),
    name: 'BDO Ana',
    balance: 71374.33,
    type: 'debit',
    icon: 'bank',
    color: '#FFD700',
  },
  {
    id: generateObjectId(),
    name: 'Wallet Lorenz',
    balance: 1258,
    type: 'wallet',
    icon: 'wallet',
    color: '#666666',
  },
  {
    id: generateObjectId(),
    name: 'UnionBank CC Ana',
    balance: -19117.77,
    type: 'credit',
    icon: 'bank',
    color: '#5C6BC0',
    creditLimit: 122882,
  },
  {
    id: generateObjectId(),
    name: 'Security Bank CC Lorenz',
    balance: -30085.37,
    type: 'credit',
    icon: 'bank',
    color: '#FFD700',
    creditLimit: 169915,
  },
];

const initialCategories: Category[] = [
  {
    id: '1',
    name: 'Groceries',
    icon: 'cart',
    color: '#3D9BFC',
    type: 'Expense',
  },
  {
    id: '2',
    name: 'Eating out',
    icon: 'silverware-fork-knife',
    color: '#505F92',
    type: 'Expense',
  },
  {
    id: '3',
    name: 'Leisure',
    icon: 'ticket',
    color: '#E6427B',
    type: 'Expense',
  },
  {
    id: '4',
    name: 'Transport',
    icon: 'bus',
    color: '#C09046',
    type: 'Expense',
  },
  {
    id: '5',
    name: 'Health',
    icon: 'heart-pulse',
    color: '#3A8A47',
    type: 'Expense',
  },
  {
    id: '6',
    name: 'Gifts',
    icon: 'gift',
    color: '#E74C3C',
    type: 'Expense',
  },
  {
    id: '7',
    name: 'Family',
    icon: 'account-group',
    color: '#5D3F92',
    type: 'Expense',
  },
  {
    id: '8',
    name: 'Shopping',
    icon: 'shopping',
    color: '#C1834B',
    type: 'Expense',
  },
  {
    id: '9',
    name: 'Bills',
    icon: 'file-document',
    color: '#FF5B9E',
    type: 'Expense',
  },
  {
    id: '10',
    name: 'Gas',
    icon: 'gas-station',
    color: '#F39C12',
    type: 'Expense',
  },
  {
    id: '11',
    name: 'Transfer fees',
    icon: 'bank-transfer',
    color: '#3498DB',
    type: 'Expense',
  },
  {
    id: '12',
    name: 'Salary',
    icon: 'briefcase',
    color: '#2196F3',
    type: 'Income',
  },
  {
    id: '13',
    name: 'Freelance',
    icon: 'laptop',
    color: '#4CAF50',
    type: 'Income',
  },
  {
    id: '14',
    name: 'Investment',
    icon: 'chart-line',
    color: '#FF9800',
    type: 'Income',
  },
];

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      try {
        await databaseService.initialize();
        await refreshData();
        
        const hasInitialData = await databaseService.getAllAccounts();
        if (hasInitialData.length === 0) {
          for (const account of initialAccounts) {
            const syncableAccount = {
              ...account,
              updatedAt: Date.now(),
              isDeleted: false
            };
            await databaseService.saveAccount(syncableAccount);
          }
          await refreshData();
        }
        
        // Disable auto-sync by default
        await syncService.setAutoSyncEnabled(false);
        // Set a longer interval for auto-sync when it's enabled
        await syncService.setAutoSyncInterval(300000); // 5 minutes
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };

    const setupNetworkListener = () => {
      const unsubscribe = NetInfo.addEventListener(state => {
        setIsOnline(!!(state.isConnected && state.isInternetReachable));
      });
      return unsubscribe;
    };

    const setupSyncCallback = () => {
      const callback = (result: SyncResult) => {
        setLastSyncResult(result);
        setIsSyncing(false);
        if (result.success && (result.pulledCount || 0) > 0) {
          refreshData();
        }
      };
      
      syncService.addSyncCallback(callback);
      return () => syncService.removeSyncCallback(callback);
    };

    initializeData();
    const unsubscribeNetwork = setupNetworkListener();
    const unsubscribeSync = setupSyncCallback();

    return () => {
      unsubscribeNetwork();
      unsubscribeSync();
      syncService.stopAutoSync();
    };
  }, []);

  const refreshData = async () => {
    try {
      if (!databaseService.isReady()) {
        console.log('Database not ready, skipping refresh');
        return;
      }
      
      const accountsData = await databaseService.getAllAccounts();
      const mappedAccounts = accountsData.map(account => ({
        id: account.id,
        name: account.name,
        balance: account.balance,
        type: account.type,
        icon: account.icon,
        color: account.color,
        description: account.description,
        includeInTotal: account.includeInTotal,
        creditLimit: account.creditLimit,
        order: account.order
      }));
      
      setAccounts(mappedAccounts);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  const syncData = async (force: boolean = false) => {
    try {
      setIsSyncing(true);
      const result = await syncService.sync(force);
      setLastSyncResult(result);
      setIsSyncing(false);
      
      if (result.success) {
        // Ensure the UI message reflects the correct counts
        console.log(`UI Sync completed - Pushed: ${result.pushedCount}, Pulled: ${result.pulledCount}`);
        if ((result.pulledCount || 0) > 0) {
          refreshData();
        }
      }
      return result;
    } catch (error) {
      console.error('Error syncing data:', error);
      setIsSyncing(false);
      return { success: false, error: (error as Error).message };
    }
  };

  const addAccount = async (account: Account) => {
    try {
      if (!databaseService.isReady()) {
        await databaseService.initialize();
      }
      
      const syncableAccount = {
        ...account,
        updatedAt: Date.now(),
        isDeleted: false
      };
      
      await databaseService.saveAccount(syncableAccount);
      await refreshData();
      
      if (isOnline) {
        await syncData();
      }
    } catch (error) {
      console.error('Failed to add account:', error);
    }
  };

  const updateAccount = async (updatedAccount: Account) => {
    try {
      if (!databaseService.isReady()) {
        console.error('Database not ready');
        return;
      }
      
      // Get the existing account to preserve serverUpdatedAt if it exists
      const existingAccount = await databaseService.getAccountById(updatedAccount.id);
      
      // Create a timestamp that's guaranteed to be newer than any existing timestamp
      const now = Date.now();
      
      await databaseService.saveAccount({
        ...updatedAccount,
        // Ensure timestamp is newer than any previous one
        updatedAt: now + 1,
        // Preserve server timestamp if it exists
        serverUpdatedAt: existingAccount?.serverUpdatedAt,
        isDeleted: false
      });
      
      console.log(`Account updated: ${updatedAccount.name} with timestamp ${now + 1}`);
      
      await refreshData();
      
      if (isOnline) {
        await syncData();  // Remove timeout and await the sync
      }
    } catch (error) {
      console.error('Failed to update account:', error);
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      if (!databaseService.isReady()) {
        console.error('Database not ready');
        return;
      }
      
      await databaseService.deleteAccount(id);
      await refreshData();
      
      if (isOnline) {
        await syncData();
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  const reorderAccounts = async (reorderedAccounts: Account[]) => {
    try {
      // Update the local state with the new order
      setAccounts(reorderedAccounts);
      
      // Prepare the order updates for the database
      const orderUpdates = reorderedAccounts.map((account, index) => ({
        id: account.id,
        order: index
      }));
      
      // Update the database with the new order
      await databaseService.updateAccountsOrder(orderUpdates);
      
      // Sync the changes if online
      if (isOnline) {
        await syncData();
      }
    } catch (error) {
      console.error('Error reordering accounts:', error);
    }
  };

  const addCategory = (category: Category) => {
    setCategories(prev => [...prev, category]);
  };

  const updateCategory = (updatedCategory: Category) => {
    setCategories(prev => prev.map(cat => 
      cat.id === updatedCategory.id ? updatedCategory : cat
    ));
  };

  return (
    <DataContext.Provider
      value={{
        accounts,
        categories,
        isOnline,
        isSyncing,
        lastSyncResult,
        setAccounts,
        setCategories,
        addAccount,
        updateAccount,
        deleteAccount,
        reorderAccounts,
        addCategory,
        updateCategory,
        syncData,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}; 