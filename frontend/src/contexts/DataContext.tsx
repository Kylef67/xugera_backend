import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiService } from '../services/apiService';
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
  amount?: number;
  transactions?: number;
};

interface DataContextType {
  accounts: Account[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  setAccounts: (accounts: Account[]) => void;
  setCategories: (categories: Category[]) => void;
  addAccount: (account: Account) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  reorderAccounts: (reorderedAccounts: Account[]) => Promise<void>;
  addCategory: (category: Category) => void;
  updateCategory: (category: Category) => void;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

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
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
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
      console.error('Failed to refresh data:', error);
      setError('Failed to refresh data');
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
        await refreshData();
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
        await refreshData();
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
        await refreshData();
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
        await refreshData();
      }
    } catch (error) {
      console.error('Error reordering accounts:', error);
      setError('Error reordering accounts');
      // Revert the optimistic update
      await refreshData();
    } finally {
      setLoading(false);
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
        loading,
        error,
        setAccounts,
        setCategories,
        addAccount,
        updateAccount,
        deleteAccount,
        reorderAccounts,
        addCategory,
        updateCategory,
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