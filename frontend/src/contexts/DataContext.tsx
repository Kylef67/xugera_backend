import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  setAccounts: (accounts: Account[]) => void;
  setCategories: (categories: Category[]) => void;
  addAccount: (account: Account) => void;
  updateAccount: (account: Account) => void;
  addCategory: (category: Category) => void;
  updateCategory: (category: Category) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const initialAccounts: Account[] = [
  {
    id: '1',
    name: 'KOMOs Lorenz',
    balance: 74980.39,
    type: 'debit',
    icon: 'credit-card',
    color: '#FF4B8C',
  },
  {
    id: '2',
    name: 'BPI Ana',
    balance: 16805.94,
    type: 'debit',
    icon: 'credit-card',
    color: '#4CAF50',
  },
  {
    id: '3',
    name: 'Union Bank Lorenz',
    balance: 8992.90,
    type: 'debit',
    icon: 'credit-card',
    color: '#4CAF50',
  },
  {
    id: '4',
    name: 'BDO Ana',
    balance: 71374.33,
    type: 'debit',
    icon: 'bank',
    color: '#FFD700',
  },
  {
    id: '5',
    name: 'Wallet Lorenz',
    balance: 1258,
    type: 'wallet',
    icon: 'wallet',
    color: '#666666',
  },
  {
    id: '6',
    name: 'UnionBank CC Ana',
    balance: -19117.77,
    type: 'credit',
    icon: 'bank',
    color: '#5C6BC0',
    creditLimit: 122882,
  },
  {
    id: '7',
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
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  const addAccount = (account: Account) => {
    setAccounts(prev => [...prev, account]);
  };

  const updateAccount = (updatedAccount: Account) => {
    setAccounts(prev => prev.map(acc => 
      acc.id === updatedAccount.id ? updatedAccount : acc
    ));
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
    <DataContext.Provider value={{
      accounts,
      categories,
      setAccounts,
      setCategories,
      addAccount,
      updateAccount,
      addCategory,
      updateCategory,
    }}>
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