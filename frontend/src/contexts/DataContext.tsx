import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiService, Category as ApiCategory, Transaction as ApiTransaction } from '../services/apiService';
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
  isDeleted?: boolean;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'Income' | 'Expense';
  description?: string;
  parent?: string | null;
  subcategories?: Category[];
  transactions?: {
    direct: { total: number; count: number };
    subcategories: { total: number; count: number };
    all: { total: number; count: number };
  };
  // Legacy fields for backward compatibility
  amount?: number;
  transactionCount?: number;
};

export type Transaction = {
  id: string;
  transactionDate: string;
  fromAccount: string | Account;
  toAccount?: string | Account;
  category?: string | Category;
  amount: number;
  description?: string;
  notes?: string;
  type?: 'income' | 'expense' | 'transfer';
};

interface DataContextType {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  setAccounts: (accounts: Account[]) => void;
  setCategories: (categories: Category[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  addAccount: (account: Account) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  reorderAccounts: (reorderedAccounts: Account[]) => Promise<void>;
  addCategory: (category: Category) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getSubcategories: (parentId: string) => Promise<Category[]>;
  getCategoryTransactions: (categoryId: string, fromDate?: string, toDate?: string) => Promise<any>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  getTransactions: (params?: {
    fromAccount?: string;
    toAccount?: string;
    category?: string;
    fromDate?: string;
    toDate?: string;
  }) => Promise<Transaction[]>;
  refreshData: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    await Promise.all([
      refreshAccounts(),
      refreshCategories(),
      refreshTransactions()
    ]);
  };

  const refreshAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiService.getAllAccounts();
      
      if (result.success && result.data) {
        // Filter out deleted accounts and sort by order
        const activeAccounts = result.data
          .filter(account => !account.isDeleted)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        setAccounts(activeAccounts);
      } else {
        setError(result.error || 'Failed to fetch accounts');
      }
    } catch (error) {
      console.error('Failed to refresh accounts:', error);
      setError('Failed to refresh accounts');
    } finally {
      setLoading(false);
    }
  };

  const refreshCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiService.getAllCategories();
      
      if (result.success && result.data) {
        // Transform API categories to match frontend format
        const transformedCategories: Category[] = result.data.map(apiCategory => ({
          id: apiCategory.id,
          name: apiCategory.name,
          icon: apiCategory.icon || 'help-circle', // Default icon if not provided
          color: apiCategory.color || '#666666', // Default color if not provided
          type: apiCategory.type || 'Expense', // Default type if not provided
          description: apiCategory.description,
          parent: apiCategory.parent,
          subcategories: apiCategory.subcategories?.map(sub => ({
            id: sub.id,
            name: sub.name,
            icon: sub.icon || 'help-circle',
            color: sub.color || '#666666',
            type: sub.type || 'Expense',
            description: sub.description,
            parent: sub.parent,
            transactions: sub.transactions,
          })) || [],
          transactions: apiCategory.transactions,
          // Legacy compatibility fields
          amount: apiCategory.transactions?.all.total || 0,
          transactionCount: apiCategory.transactions?.all.count || 0,
        }));
        
        setCategories(transformedCategories);
      } else {
        // If no categories exist, create default ones
        if (result.error?.includes('Empty')) {
          await seedDefaultCategories();
        } else {
          setError(result.error || 'Failed to fetch categories');
        }
      }
    } catch (error) {
      console.error('Failed to refresh categories:', error);
      setError('Failed to refresh categories');
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultCategories = async () => {
    const defaultCategories = [
      { name: 'Groceries', icon: 'cart', color: '#3D9BFC', type: 'Expense' as const, description: 'Food and grocery shopping' },
      { name: 'Eating out', icon: 'silverware-fork-knife', color: '#505F92', type: 'Expense' as const, description: 'Restaurants and dining' },
      { name: 'Leisure', icon: 'ticket', color: '#E6427B', type: 'Expense' as const, description: 'Entertainment and recreation' },
      { name: 'Transport', icon: 'bus', color: '#C09046', type: 'Expense' as const, description: 'Transportation costs' },
      { name: 'Health', icon: 'heart-pulse', color: '#3A8A47', type: 'Expense' as const, description: 'Medical and health expenses' },
      { name: 'Gifts', icon: 'gift', color: '#E74C3C', type: 'Expense' as const, description: 'Gifts and presents' },
      { name: 'Family', icon: 'account-group', color: '#5D3F92', type: 'Expense' as const, description: 'Family expenses' },
      { name: 'Shopping', icon: 'shopping', color: '#C1834B', type: 'Expense' as const, description: 'General shopping' },
      { name: 'Bills', icon: 'file-document', color: '#FF5B9E', type: 'Expense' as const, description: 'Utility bills and payments' },
      { name: 'Gas', icon: 'gas-station', color: '#F39C12', type: 'Expense' as const, description: 'Fuel and gas' },
      { name: 'Transfer fees', icon: 'bank-transfer', color: '#3498DB', type: 'Expense' as const, description: 'Bank and transfer fees' },
      { name: 'Salary', icon: 'briefcase', color: '#2196F3', type: 'Income' as const, description: 'Salary and wages' },
      { name: 'Freelance', icon: 'laptop', color: '#4CAF50', type: 'Income' as const, description: 'Freelance income' },
      { name: 'Investment', icon: 'chart-line', color: '#FF9800', type: 'Income' as const, description: 'Investment returns' },
    ];

    try {
      for (const category of defaultCategories) {
        await apiService.createCategory(category);
      }
      await refreshCategories();
    } catch (error) {
      console.error('Failed to seed default categories:', error);
    }
  };

  const refreshTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiService.getAllTransactions();
      
      if (result.success && result.data) {
        setTransactions(result.data);
      } else {
        setError(result.error || 'Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Failed to refresh transactions:', error);
      setError('Failed to refresh transactions');
    } finally {
      setLoading(false);
    }
  };

  const addAccount = async (account: Account) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiService.createAccount({
        name: account.name,
        balance: account.balance,
        type: account.type,
        icon: account.icon,
        color: account.color,
        description: account.description,
        includeInTotal: account.includeInTotal,
        creditLimit: account.creditLimit,
        order: account.order,
      });

      if (result.success) {
        await refreshAccounts();
      } else {
        setError(result.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Failed to add account:', error);
      setError('Failed to add account');
    } finally {
      setLoading(false);
    }
  };

  const updateAccount = async (updatedAccount: Account) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiService.updateAccount(updatedAccount.id, {
        name: updatedAccount.name,
        balance: updatedAccount.balance,
        type: updatedAccount.type,
        icon: updatedAccount.icon,
        color: updatedAccount.color,
        description: updatedAccount.description,
        includeInTotal: updatedAccount.includeInTotal,
        creditLimit: updatedAccount.creditLimit,
        order: updatedAccount.order,
      });

      if (result.success) {
        await refreshAccounts();
      } else {
        setError(result.error || 'Failed to update account');
      }
    } catch (error) {
      console.error('Failed to update account:', error);
      setError('Failed to update account');
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiService.deleteAccount(id);

      if (result.success) {
        await refreshAccounts();
      } else {
        setError(result.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      setError('Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  const reorderAccounts = async (reorderedAccounts: Account[]) => {
    try {
      setLoading(true);
      setError(null);
      
      // Update local state optimistically
      setAccounts(reorderedAccounts);
      
      // Prepare the order updates for the API
      const orderUpdates = reorderedAccounts.map((account, index) => ({
        id: account.id,
        order: index
      }));
      
      const result = await apiService.updateAccountsOrder(orderUpdates);

      if (!result.success) {
        setError(result.error || 'Failed to reorder accounts');
        // Revert the optimistic update
        await refreshAccounts();
      }
    } catch (error) {
      console.error('Error reordering accounts:', error);
      setError('Error reordering accounts');
      // Revert the optimistic update
      await refreshAccounts();
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (category: Category) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiService.createCategory({
        name: category.name,
        description: category.description,
        icon: category.icon,
        color: category.color,
        type: category.type,
        parent: category.parent,
      });

      if (result.success) {
        await refreshCategories();
      } else {
        setError(result.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Failed to add category:', error);
      setError('Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const updateCategory = async (updatedCategory: Category) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiService.updateCategory(updatedCategory.id, {
        name: updatedCategory.name,
        description: updatedCategory.description,
        icon: updatedCategory.icon,
        color: updatedCategory.color,
        type: updatedCategory.type,
        parent: updatedCategory.parent,
      });

      if (result.success) {
        await refreshCategories();
      } else {
        setError(result.error || 'Failed to update category');
      }
    } catch (error) {
      console.error('Failed to update category:', error);
      setError('Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiService.deleteCategory(id);

      if (result.success) {
        await refreshCategories();
      } else {
        setError(result.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      setError('Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const getSubcategories = async (parentId: string): Promise<Category[]> => {
    try {
      const result = await apiService.getSubcategories(parentId);
      if (result.success && result.data) {
        // Transform API categories to match frontend format
        return result.data.map(apiCategory => ({
          id: apiCategory.id,
          name: apiCategory.name,
          icon: apiCategory.icon || 'help-circle',
          color: apiCategory.color || '#666666',
          type: apiCategory.type || 'Expense',
          description: apiCategory.description,
          parent: apiCategory.parent,
          subcategories: [],
          transactions: apiCategory.transactions,
          amount: apiCategory.transactions?.all.total || 0,
          transactionCount: apiCategory.transactions?.all.count || 0,
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to get subcategories:', error);
      return [];
    }
  };

  const getCategoryTransactions = async (categoryId: string, fromDate?: string, toDate?: string) => {
    try {
      const result = await apiService.getCategoryTransactions(categoryId, fromDate, toDate);
      if (result.success) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to get category transactions:', error);
      return null;
    }
  };

  const addTransaction = async (transaction: Transaction) => {
    try {
      setLoading(true);
      setError(null);
      
      // Extract IDs from populated objects if necessary
      const fromAccountId = typeof transaction.fromAccount === 'object' 
        ? transaction.fromAccount.id 
        : transaction.fromAccount;
      const toAccountId = typeof transaction.toAccount === 'object' 
        ? transaction.toAccount?.id 
        : transaction.toAccount;
      const categoryId = typeof transaction.category === 'object' 
        ? transaction.category?.id 
        : transaction.category;
      
      const result = await apiService.createTransaction({
        transactionDate: transaction.transactionDate,
        fromAccount: fromAccountId,
        toAccount: toAccountId,
        category: categoryId,
        amount: transaction.amount,
        description: transaction.description,
        notes: transaction.notes,
        type: transaction.type,
      });

      if (result.success) {
        await refreshTransactions();
      } else {
        setError(result.error || 'Failed to create transaction');
      }
    } catch (error) {
      console.error('Failed to add transaction:', error);
      setError('Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  const updateTransaction = async (updatedTransaction: Transaction) => {
    try {
      setLoading(true);
      setError(null);
      
      // Extract IDs from populated objects if necessary
      const fromAccountId = typeof updatedTransaction.fromAccount === 'object' 
        ? updatedTransaction.fromAccount.id 
        : updatedTransaction.fromAccount;
      const toAccountId = typeof updatedTransaction.toAccount === 'object' 
        ? updatedTransaction.toAccount?.id 
        : updatedTransaction.toAccount;
      const categoryId = typeof updatedTransaction.category === 'object' 
        ? updatedTransaction.category?.id 
        : updatedTransaction.category;
      
      const result = await apiService.updateTransaction(updatedTransaction.id, {
        transactionDate: updatedTransaction.transactionDate,
        fromAccount: fromAccountId,
        toAccount: toAccountId,
        category: categoryId,
        amount: updatedTransaction.amount,
        description: updatedTransaction.description,
        notes: updatedTransaction.notes,
        type: updatedTransaction.type,
      });

      if (result.success) {
        await refreshTransactions();
      } else {
        setError(result.error || 'Failed to update transaction');
      }
    } catch (error) {
      console.error('Failed to update transaction:', error);
      setError('Failed to update transaction');
    } finally {
      setLoading(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiService.deleteTransaction(id);

      if (result.success) {
        await refreshTransactions();
      } else {
        setError(result.error || 'Failed to delete transaction');
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      setError('Failed to delete transaction');
    } finally {
      setLoading(false);
    }
  };

     const getTransactions = async (params?: {
     fromAccount?: string;
     toAccount?: string;
     category?: string;
     fromDate?: string;
     toDate?: string;
   }) => {
     try {
       const result = await apiService.getAllTransactions(params);
       if (result.success && result.data) {
         return result.data;
       }
       return [];
     } catch (error) {
       console.error('Failed to get transactions:', error);
       return [];
     }
   };

  return (
    <DataContext.Provider
      value={{
        accounts,
        categories,
        transactions,
        loading,
        error,
        setAccounts,
        setCategories,
        setTransactions,
        addAccount,
        updateAccount,
        deleteAccount,
        reorderAccounts,
        addCategory,
        updateCategory,
        deleteCategory,
        getSubcategories,
        getCategoryTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        getTransactions,
        refreshData,
        refreshCategories,
        refreshTransactions,
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