import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, ApiResponse } from '../services/apiService';
import type { Category as ApiCategory, Transaction as ApiTransaction } from '../services/apiService';

// Frontend types that match the server models
export interface Account {
  id: string;
  name: string;
  description?: string;
  balance?: number;
  type?: 'debit' | 'credit' | 'wallet';
  icon?: string;
  color?: string;
  includeInTotal?: boolean;
  creditLimit?: number;
  order?: number;
  isDeleted?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  type?: 'Income' | 'Expense';
  parent?: string | null;
  order?: number;
  balance?: number;
  directBalance?: number;
  transactionCount?: number;
  directTransactionCount?: number;
  subcategories?: Category[];
}

export interface Transaction {
  id: string;
  transactionDate: string;
  fromAccount: string;
  toAccount?: string;
  category?: string;
  amount: number;
  description?: string;
  notes?: string;
  type?: 'income' | 'expense' | 'transfer';
  isDeleted?: boolean;
}

// Context type
interface DataContextType {
  // State
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
  isLoadingData: boolean;

  // Account methods
  addAccount: (account: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  reorderAccounts: (accounts: Account[]) => Promise<void>;

  // Category methods
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reorderCategories: (categories: Category[]) => Promise<void>;
  getSubcategories: (parentId: string) => Promise<Category[]>;
  getCategoryTransactions: (categoryId: string, fromDate?: string, toDate?: string) => Promise<any>;

  // Transaction methods
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  getTransactions: (params?: any) => Promise<Transaction[]>;

  // Utility methods
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Provider component
interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Computed properties
  const isLoadingData = loading;

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [accountsResponse, categoriesResponse, transactionsResponse] = await Promise.all([
        apiService.getAllAccounts(),
        apiService.getAllCategories(),
        apiService.getAllTransactions()
      ]);
      
      if (accountsResponse.success && accountsResponse.data) {
        setAccounts(accountsResponse.data);
      }
      if (categoriesResponse.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data);
      }
      if (transactionsResponse.success && transactionsResponse.data) {
        setTransactions(transactionsResponse.data);
      }

      // Check for any errors
      if (!accountsResponse.success) {
        throw new Error(accountsResponse.error || 'Failed to load accounts');
      }
      if (!categoriesResponse.success) {
        throw new Error(categoriesResponse.error || 'Failed to load categories');
      }
      if (!transactionsResponse.success) {
        throw new Error(transactionsResponse.error || 'Failed to load transactions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  };

  // Account methods
  const addAccount = async (accountData: Omit<Account, 'id'>) => {
    try {
      // Optimistic update
      const tempAccount: Account = {
        ...accountData,
        id: `temp-${Date.now()}`, // Temporary ID for optimistic update
      };
      setAccounts(prev => [...prev, tempAccount]);

      // API call
      const response = await apiService.createAccount(accountData);
      
      if (response.success && response.data?.data) {
        // Replace temp account with real one
        setAccounts(prev => prev.map(acc => 
          acc.id === tempAccount.id ? response.data!.data : acc
        ));
      } else {
        throw new Error(response.error || 'Failed to create account');
      }
    } catch (err) {
      // Revert optimistic update
      setAccounts(prev => prev.filter(acc => !acc.id.startsWith('temp-')));
      setError(err instanceof Error ? err.message : 'Failed to add account');
      throw err;
    }
  };

  const updateAccount = async (account: Account) => {
    try {
      // Optimistic update
      const originalAccounts = [...accounts];
      setAccounts(prev => prev.map(acc => 
        acc.id === account.id ? account : acc
      ));

      // API call
      const response = await apiService.updateAccount(account.id, account);
      
      if (!response.success) {
        // Revert optimistic update
        setAccounts(originalAccounts);
        throw new Error(response.error || 'Failed to update account');
      }
    } catch (err) {
      // Revert optimistic update - reload data
      await loadAllData();
      setError(err instanceof Error ? err.message : 'Failed to update account');
      throw err;
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      // Optimistic update
      const originalAccounts = [...accounts];
      setAccounts(prev => prev.filter(acc => acc.id !== id));

      // API call
      const response = await apiService.deleteAccount(id);
      
      if (!response.success) {
        // Revert optimistic update
        setAccounts(originalAccounts);
        throw new Error(response.error || 'Failed to delete account');
      }
    } catch (err) {
      // Revert optimistic update
      setAccounts(accounts);
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      throw err;
    }
  };

  const reorderAccounts = async (reorderedAccounts: Account[]) => {
    try {
      // Optimistic update
      const originalAccounts = [...accounts];
      setAccounts(reorderedAccounts);

      // API call - use the order update endpoint
      const orderData = reorderedAccounts.map((account, index) => ({
        id: account.id,
        order: index
      }));
      
      const response = await apiService.updateAccountsOrder(orderData);
      
      if (!response.success) {
        // Revert optimistic update
        setAccounts(originalAccounts);
        throw new Error(response.error || 'Failed to reorder accounts');
      }
    } catch (err) {
      // Revert optimistic update
      await loadAllData();
      setError(err instanceof Error ? err.message : 'Failed to reorder accounts');
      throw err;
    }
  };

  // Category methods
  const addCategory = async (categoryData: Omit<Category, 'id'>) => {
    try {
      // Optimistic update
      const tempCategory: Category = {
        ...categoryData,
        id: `temp-${Date.now()}`,
      };
      setCategories(prev => [...prev, tempCategory]);

      // API call
      const response = await apiService.createCategory(categoryData);
      
      if (response.success && response.data?.data) {
        // Replace temp category with real one
        setCategories(prev => prev.map(cat => 
          cat.id === tempCategory.id ? response.data!.data : cat
        ));
      } else {
        throw new Error(response.error || 'Failed to create category');
      }
    } catch (err) {
      // Revert optimistic update
      setCategories(prev => prev.filter(cat => !cat.id.startsWith('temp-')));
      setError(err instanceof Error ? err.message : 'Failed to add category');
      throw err;
    }
  };

  const updateCategory = async (category: Category) => {
    try {
      // Optimistic update
      const originalCategories = [...categories];
      setCategories(prev => prev.map(cat => 
        cat.id === category.id ? category : cat
      ));

      // API call
      const response = await apiService.updateCategory(category.id, category);
      
      if (!response.success) {
        // Revert optimistic update
        setCategories(originalCategories);
        throw new Error(response.error || 'Failed to update category');
      }
    } catch (err) {
      // Revert optimistic update
      await loadAllData();
      setError(err instanceof Error ? err.message : 'Failed to update category');
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      // Optimistic update
      const originalCategories = [...categories];
      setCategories(prev => prev.filter(cat => cat.id !== id));

      // API call
      const response = await apiService.deleteCategory(id);
      
      if (!response.success) {
        // Revert optimistic update
        setCategories(originalCategories);
        throw new Error(response.error || 'Failed to delete category');
      }
    } catch (err) {
      // Revert optimistic update
      setCategories(categories);
      setError(err instanceof Error ? err.message : 'Failed to delete category');
      throw err;
    }
  };

  const reorderCategories = async (reorderedCategories: Category[]) => {
    try {
      // Optimistic update
      const originalCategories = [...categories];
      setCategories(reorderedCategories);

      // API call - update each category with new order
      const updatePromises = reorderedCategories.map((category, index) =>
        apiService.updateCategory(category.id, { order: index })
      );
      
      const responses = await Promise.all(updatePromises);
      
      // Check if any failed
      const failedResponse = responses.find(response => !response.success);
      if (failedResponse) {
        // Revert optimistic update
        setCategories(originalCategories);
        throw new Error(failedResponse.error || 'Failed to reorder categories');
      }
    } catch (err) {
      // Revert optimistic update
      setCategories(categories);
      setError(err instanceof Error ? err.message : 'Failed to reorder categories');
      throw err;
    }
  };

  // Transaction methods
  const addTransaction = async (transactionData: Omit<Transaction, 'id'>) => {
    try {
      // Optimistic update
      const tempTransaction: Transaction = {
        ...transactionData,
        id: `temp-${Date.now()}`,
      };
      setTransactions(prev => [...prev, tempTransaction]);

      // API call
      const response = await apiService.createTransaction(transactionData);
      
      if (response.success && response.data?.data) {
        // Replace temp transaction with real one
        setTransactions(prev => prev.map(trans => 
          trans.id === tempTransaction.id ? response.data!.data : trans
        ));
      } else {
        throw new Error(response.error || 'Failed to create transaction');
      }
    } catch (err) {
      // Revert optimistic update
      setTransactions(prev => prev.filter(trans => !trans.id.startsWith('temp-')));
      setError(err instanceof Error ? err.message : 'Failed to add transaction');
      throw err;
    }
  };

  const updateTransaction = async (transaction: Transaction) => {
    try {
      // Optimistic update
      const originalTransactions = [...transactions];
      setTransactions(prev => prev.map(trans => 
        trans.id === transaction.id ? transaction : trans
      ));

      // API call
      const response = await apiService.updateTransaction(transaction.id, transaction);
      
      if (!response.success) {
        // Revert optimistic update
        setTransactions(originalTransactions);
        throw new Error(response.error || 'Failed to update transaction');
      }
    } catch (err) {
      // Revert optimistic update
      await loadAllData();
      setError(err instanceof Error ? err.message : 'Failed to update transaction');
      throw err;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      // Optimistic update
      const originalTransactions = [...transactions];
      setTransactions(prev => prev.filter(trans => trans.id !== id));

      // API call
      const response = await apiService.deleteTransaction(id);
      
      if (!response.success) {
        // Revert optimistic update
        setTransactions(originalTransactions);
        throw new Error(response.error || 'Failed to delete transaction');
      }
    } catch (err) {
      // Revert optimistic update
      setTransactions(transactions);
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
      throw err;
    }
  };

  const refreshData = async () => {
    await loadAllData();
  };

  // Additional API methods
  const getSubcategories = async (parentId: string): Promise<Category[]> => {
    try {
      const response = await apiService.getSubcategories(parentId);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to get subcategories');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get subcategories');
      return [];
    }
  };

  const getCategoryTransactions = async (categoryId: string, fromDate?: string, toDate?: string): Promise<any> => {
    try {
      const response = await apiService.getCategoryTransactions(categoryId, fromDate, toDate);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to get category transactions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get category transactions');
      return null;
    }
  };

  const getTransactions = async (params?: any): Promise<Transaction[]> => {
    try {
      const response = await apiService.getAllTransactions(params);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to get transactions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get transactions');
      return [];
    }
  };

  const value: DataContextType = {
    // State
    accounts,
    categories,
    transactions,
    loading,
    error,
    isInitialized,
    isLoadingData,

    // Account methods
    addAccount,
    updateAccount,
    deleteAccount,
    reorderAccounts,

    // Category methods
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    getSubcategories,
    getCategoryTransactions,

    // Transaction methods
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactions,

    // Utility methods
    refreshData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

// Hook to use the context
export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}