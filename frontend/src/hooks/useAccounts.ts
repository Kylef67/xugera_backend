import { useState, useEffect, useCallback } from 'react';
import { storageService, Account } from '../services/storageService';
import { syncService } from '../services/syncService';

export const useAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      const loadedAccounts = await storageService.getAccounts();
      setAccounts(loadedAccounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAccounts = useCallback(async () => {
    setRefreshing(true);
    await loadAccounts();
    setRefreshing(false);
  }, [loadAccounts]);

  const addAccount = useCallback(async (accountData: {
    name: string;
    description: string;
    balance?: number;
    type?: 'debit' | 'credit' | 'wallet';
    icon?: string;
    color?: string;
  }) => {
    try {
      const newAccount = await storageService.saveAccount({
        name: accountData.name,
        description: accountData.description,
        balance: accountData.balance || 0,
        type: accountData.type || 'debit',
        icon: accountData.icon || 'credit-card',
        color: accountData.color || '#4CAF50'
      });
      
      // Update local state immediately
      setAccounts(prev => [...prev, newAccount]);
      
      // Try to sync if online
      if (syncService.getConnectionStatus()) {
        try {
          await syncService.syncData();
          // Reload to get any server updates
          await loadAccounts();
        } catch (error) {
          console.log('Sync after add failed:', error);
        }
      }
      
      return newAccount;
    } catch (error) {
      console.error('Error adding account:', error);
      throw error;
    }
  }, [loadAccounts]);

  const updateAccount = useCallback(async (id: string, updates: Partial<Account>) => {
    try {
      const updatedAccount = await storageService.updateAccount(id, updates);
      if (updatedAccount) {
        // Update local state immediately
        setAccounts(prev => prev.map(acc => 
          acc.id === id ? updatedAccount : acc
        ));
        
        // Try to sync if online
        if (syncService.getConnectionStatus()) {
          try {
            await syncService.syncData();
            await loadAccounts();
          } catch (error) {
            console.log('Sync after update failed:', error);
          }
        }
      }
      return updatedAccount;
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  }, [loadAccounts]);

  const deleteAccount = useCallback(async (id: string) => {
    try {
      const success = await storageService.deleteAccount(id);
      if (success) {
        // Update local state immediately
        setAccounts(prev => prev.filter(acc => acc.id !== id));
        
        // Try to sync if online
        if (syncService.getConnectionStatus()) {
          try {
            await syncService.syncData();
          } catch (error) {
            console.log('Sync after delete failed:', error);
          }
        }
      }
      return success;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }, []);

  const reorderAccounts = useCallback(async (reorderedAccounts: Account[]) => {
    try {
      // Update local state immediately for responsive UI
      setAccounts(reorderedAccounts);
      
      // Update storage with new order
      await storageService.updateAccountOrder(reorderedAccounts);
      
      // Try to sync if online
      if (syncService.getConnectionStatus()) {
        try {
          await syncService.syncData();
          // Reload to get any server updates
          await loadAccounts();
        } catch (error) {
          console.log('Sync after reorder failed:', error);
        }
      }
    } catch (error) {
      console.error('Error reordering accounts:', error);
      // Revert local state on error
      await loadAccounts();
      throw error;
    }
  }, [loadAccounts]);

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Listen for network changes and sync
  useEffect(() => {
    const interval = setInterval(() => {
      if (syncService.getConnectionStatus() && !syncService.isSyncing()) {
        // Auto-sync every 30 seconds when online
        syncService.syncData().then(() => {
          loadAccounts();
        }).catch(error => {
          console.log('Auto-sync failed:', error);
        });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loadAccounts]);

  return {
    accounts,
    loading,
    refreshing,
    addAccount,
    updateAccount,
    deleteAccount,
    refreshAccounts,
    reorderAccounts
  };
}; 