import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiService, Category as ApiCategory, Transaction as ApiTransaction } from '../services/apiService';
import { generateObjectId } from '../utils/objectId';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

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
  balance?: number; // Total balance including subcategories
  directBalance?: number; // Balance from direct transactions only
  transactionCount?: number; // Total transaction count including subcategories
  directTransactionCount?: number; // Direct transaction count only
  subcategories?: Category[];
  transactions?: {
    direct: { total: number; count: number };
    subcategories: { total: number; count: number };
    all: { total: number; count: number };
  };
  // Legacy fields for backward compatibility
  amount?: number;
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
  isDeleted?: boolean;
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
  recalculateAccountBalances: () => void;
  recalculateCategoryBalances: () => void;
  recalculateAllBalances: () => void;
}

// Define sync operation type
interface SyncOperation {
  type: string;
  payload: any;
  timestamp: number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [syncQueue, setSyncQueue] = useState<SyncOperation[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Load local data and queue on mount
  useEffect(() => {
    const init = async () => {
      // load stored data
      const storedData = await AsyncStorage.getItem('localData');
      if (storedData) {
        const { accounts: a, categories: c, transactions: t } = JSON.parse(storedData);
        if (a) setAccounts(a);
        if (c) setCategories(c);
        if (t) setTransactions(t);
      }
      // load queue
      const storedQueue = await AsyncStorage.getItem('syncQueue');
      if (storedQueue) {
        setSyncQueue(JSON.parse(storedQueue));
      }
    };
    init();
  }, []);

  // Listen to network changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(Boolean(state.isConnected));
      if (state.isConnected) {
        syncQueueToServer();
      }
    });
    return () => unsubscribe();
  }, [syncQueue]);

  // Persist local data on change
  useEffect(() => {
    AsyncStorage.setItem('localData', JSON.stringify({ accounts, categories, transactions }));
  }, [accounts, categories, transactions]);

  // Helper function to calculate account balance from transactions
  const calculateAccountBalance = (accountId: string, transactions: Transaction[]): number => {
    let balance = 0;
    
    transactions.forEach(transaction => {
      if (transaction.isDeleted) return; // Skip deleted transactions
      
      const fromAccountId = typeof transaction.fromAccount === 'object' 
        ? transaction.fromAccount.id 
        : transaction.fromAccount;
      const toAccountId = typeof transaction.toAccount === 'object' 
        ? transaction.toAccount?.id 
        : transaction.toAccount;
      
      if (transaction.type === 'income' && fromAccountId === accountId) {
        balance += transaction.amount;
      } else if (transaction.type === 'expense' && fromAccountId === accountId) {
        balance -= transaction.amount;
      } else if (transaction.type === 'transfer') {
        if (fromAccountId === accountId) {
          balance -= transaction.amount; // Transfer out
        }
        if (toAccountId === accountId) {
          balance += transaction.amount; // Transfer in
        }
      }
    });
    
    return balance;
  };

  // Helper function to update account balances based on current transactions
  const updateAccountBalances = (currentAccounts: Account[], currentTransactions: Transaction[]): Account[] => {
    return currentAccounts.map(account => ({
      ...account,
      balance: calculateAccountBalance(account.id, currentTransactions)
    }));
  };

  // Helper function to calculate category balances from transactions
  const calculateCategoryBalance = (categoryId: string, transactions: Transaction[], includeSubcategories: boolean = true): { balance: number; count: number } => {
    let balance = 0;
    let count = 0;
    
    // Get all descendant category IDs if including subcategories
    const categoriesToInclude = includeSubcategories ? getAllDescendantCategoryIds(categoryId) : [categoryId];
    
    transactions.forEach(transaction => {
      if (transaction.isDeleted) return; // Skip deleted transactions
      
      const transactionCategoryId = typeof transaction.category === 'object' 
        ? transaction.category?.id 
        : transaction.category;
      
      if (transactionCategoryId && categoriesToInclude.includes(transactionCategoryId)) {
        balance += transaction.amount;
        count++;
      }
    });
    
    return { balance, count };
  };

  // Helper function to get all descendant category IDs
  const getAllDescendantCategoryIds = (parentId: string): string[] => {
    const descendants = [parentId];
    const queue = [parentId];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = categories.filter(cat => cat.parent === currentId);
      
      children.forEach(child => {
        descendants.push(child.id);
        queue.push(child.id);
      });
    }
    
    return descendants;
  };

  // Helper function to update category balances based on current transactions
  const updateCategoryBalances = (currentCategories: Category[], currentTransactions: Transaction[]): Category[] => {
    return currentCategories.map(category => {
      const directBalance = calculateCategoryBalance(category.id, currentTransactions, false);
      const totalBalance = calculateCategoryBalance(category.id, currentTransactions, true);
      
      return {
        ...category,
        directBalance: directBalance.balance,
        directTransactionCount: directBalance.count,
        balance: totalBalance.balance,
        transactionCount: totalBalance.count,
        // Update legacy fields for backward compatibility
        amount: totalBalance.balance,
        transactions: {
          direct: { total: directBalance.balance, count: directBalance.count },
          subcategories: { 
            total: totalBalance.balance - directBalance.balance, 
            count: totalBalance.count - directBalance.count 
          },
          all: { total: totalBalance.balance, count: totalBalance.count }
        }
      };
    });
  };

  // Update category balances whenever transactions change
  useEffect(() => {
    if (transactions.length > 0 && categories.length > 0) {
      const updatedCategories = updateCategoryBalances(categories, transactions);
      
      // Only update if balances actually changed to avoid infinite loops
      const balancesChanged = updatedCategories.some((category, index) => 
        Math.abs((category.balance || 0) - (categories[index].balance || 0)) > 0.01 ||
        (category.transactionCount || 0) !== (categories[index].transactionCount || 0)
      );
      
      if (balancesChanged) {
        console.log('📊 CATEGORY BALANCE UPDATE: Recalculating category balances from transactions');
        setCategories(updatedCategories);
      }
    }
  }, [transactions]); // Only depend on transactions to avoid circular updates

  // Update account balances whenever transactions change
  useEffect(() => {
    if (transactions.length > 0 && accounts.length > 0) {
      const updatedAccounts = updateAccountBalances(accounts, transactions);
      
      // Only update if balances actually changed to avoid infinite loops
      const balancesChanged = updatedAccounts.some((account, index) => 
        Math.abs(account.balance - accounts[index].balance) > 0.01
      );
      
      if (balancesChanged) {
        console.log('📊 ACCOUNT BALANCE UPDATE: Recalculating account balances from transactions');
        setAccounts(updatedAccounts);
      }
    }
  }, [transactions]); // Only depend on transactions to avoid circular updates

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
          balance: apiCategory.balance || 0,
          directBalance: apiCategory.directBalance || 0,
          transactionCount: apiCategory.transactionCount || 0,
          directTransactionCount: apiCategory.directTransactionCount || 0,
          subcategories: apiCategory.subcategories?.map(sub => ({
            id: sub.id,
            name: sub.name,
            icon: sub.icon || 'help-circle',
            color: sub.color || '#666666',
            type: sub.type || 'Expense',
            description: sub.description,
            parent: sub.parent,
            balance: sub.balance || 0,
            directBalance: sub.directBalance || 0,
            transactionCount: sub.transactionCount || 0,
            directTransactionCount: sub.directTransactionCount || 0,
            transactions: sub.transactions,
          })) || [],
          transactions: apiCategory.transactions,
          // Legacy compatibility fields
          amount: apiCategory.transactions?.all.total || apiCategory.balance || 0,
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
        // Filter out deleted transactions
        const activeTransactions = result.data.filter(transaction => !transaction.isDeleted);
        setTransactions(activeTransactions);
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

  // helper to add operation to queue
  const addToQueue = async (op: SyncOperation) => {
    console.log('🔄 OFFLINE: Adding operation to queue', {
      type: op.type,
      payload: op.payload,
      timestamp: op.timestamp,
      queueLength: syncQueue.length + 1
    });
    setSyncQueue(prev => [...prev, op]);
  };

  // helper to process queue
  const syncQueueToServer = async () => {
    const queue = [...syncQueue];
    console.log('🌐 ONLINE: Starting sync process', {
      queueLength: queue.length,
      operations: queue.map(op => ({ type: op.type, timestamp: op.timestamp }))
    });
    
    for (const op of queue) {
      try {
        console.log('📤 SYNC: Processing operation', {
          type: op.type,
          payload: op.payload,
          timestamp: op.timestamp
        });
        
        let result;
        switch (op.type) {
          case 'addAccount':
            result = await apiService.createAccount(op.payload);
            break;
          case 'updateAccount':
            result = await apiService.updateAccount(op.payload.id, op.payload.updates);
            break;
          case 'deleteAccount':
            result = await apiService.deleteAccount(op.payload.id);
            break;
          case 'addCategory':
            result = await apiService.createCategory(op.payload);
            break;
          case 'updateCategory':
            result = await apiService.updateCategory(op.payload.id, op.payload.updates);
            break;
          case 'deleteCategory':
            result = await apiService.deleteCategory(op.payload.id);
            break;
          case 'addTransaction':
            result = await apiService.createTransaction(op.payload);
            break;
          case 'updateTransaction':
            result = await apiService.updateTransaction(op.payload.id, op.payload.updates);
            break;
          case 'deleteTransaction':
            result = await apiService.deleteTransaction(op.payload.id);
            break;
          default:
            break;
        }
        
        console.log('✅ SYNC: Operation completed successfully', {
          type: op.type,
          timestamp: op.timestamp,
          response: result
        });
        
        // remove processed op
        setSyncQueue(prev => prev.filter(item => item.timestamp !== op.timestamp));
      } catch (err) {
        console.error('❌ SYNC: Operation failed', {
          type: op.type,
          timestamp: op.timestamp,
          payload: op.payload,
          error: err
        });
        break; // stop on first failure
      }
    }
    
    console.log('🔄 SYNC: Refreshing data after sync');
    // refresh data after sync
    await refreshData();
  };

  // wrap operations to handle offline mode
  const addAccount = async (account: Account) => {
    if (!isOnline) {
      const tempId = generateObjectId();
      const localAccount = { ...account, id: tempId };
      console.log('🔄 OFFLINE: Adding account locally', {
        account: localAccount,
        queueLength: syncQueue.length
      });
      setAccounts(prev => [...prev, localAccount]);
      await addToQueue({ type: 'addAccount', payload: { ...account, id: tempId }, timestamp: Date.now() });
      return;
    }
    
    console.log('🌐 ONLINE: Creating account via API', { account });
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

      console.log('✅ ONLINE: Account created successfully', { 
        request: account,
        response: result 
      });

      if (result.success) {
        await refreshAccounts();
      } else {
        console.error('❌ ONLINE: Failed to create account', { error: result.error });
        setError(result.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('❌ ONLINE: Exception creating account', { error, account });
      setError('Failed to add account');
    } finally {
      setLoading(false);
    }
  };

  const updateAccount = async (updatedAccount: Account) => {
    if (!isOnline) {
      console.log('🔄 OFFLINE: Updating account locally', {
        account: updatedAccount,
        queueLength: syncQueue.length
      });
      setAccounts(prev => prev.map(a => a.id === updatedAccount.id ? updatedAccount : a));
      await addToQueue({ type: 'updateAccount', payload: { id: updatedAccount.id, updates: updatedAccount }, timestamp: Date.now() });
      return;
    }
    
    console.log('🌐 ONLINE: Updating account via API', { account: updatedAccount });
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

      console.log('✅ ONLINE: Account updated successfully', { 
        request: updatedAccount,
        response: result 
      });

      if (result.success) {
        await refreshAccounts();
      } else {
        console.error('❌ ONLINE: Failed to update account', { error: result.error });
        setError(result.error || 'Failed to update account');
      }
    } catch (error) {
      console.error('❌ ONLINE: Exception updating account', { error, account: updatedAccount });
      setError('Failed to update account');
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (id: string) => {
    if (!isOnline) {
      console.log('🔄 OFFLINE: Deleting account locally', {
        accountId: id,
        queueLength: syncQueue.length
      });
      setAccounts(prev => prev.filter(a => a.id !== id));
      await addToQueue({ type: 'deleteAccount', payload: { id }, timestamp: Date.now() });
      return;
    }
    
    console.log('🌐 ONLINE: Deleting account via API', { accountId: id });
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiService.deleteAccount(id);

      console.log('✅ ONLINE: Account deleted successfully', { 
        request: { id },
        response: result 
      });

      if (result.success) {
        await refreshAccounts();
      } else {
        console.error('❌ ONLINE: Failed to delete account', { error: result.error });
        setError(result.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('❌ ONLINE: Exception deleting account', { error, accountId: id });
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
    if (!isOnline) {
      const tempId = generateObjectId();
      const localCategory = { ...category, id: tempId };
      console.log('🔄 OFFLINE: Adding category locally', {
        category: localCategory,
        queueLength: syncQueue.length
      });
      setCategories(prev => [...prev, localCategory]);
      await addToQueue({ type: 'addCategory', payload: { ...category, id: tempId }, timestamp: Date.now() });
      return;
    }

    console.log('🌐 ONLINE: Creating category via API', { category });
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

      console.log('✅ ONLINE: Category created successfully', { 
        request: category,
        response: result 
      });

      if (result.success) {
        await refreshCategories();
      } else {
        console.error('❌ ONLINE: Failed to create category', { error: result.error });
        setError(result.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('❌ ONLINE: Exception creating category', { error, category });
      setError('Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const updateCategory = async (updatedCategory: Category) => {
    if (!isOnline) {
      console.log('🔄 OFFLINE: Updating category locally', {
        category: updatedCategory,
        queueLength: syncQueue.length
      });
      setCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
      await addToQueue({ type: 'updateCategory', payload: { id: updatedCategory.id, updates: updatedCategory }, timestamp: Date.now() });
      return;
    }

    console.log('🌐 ONLINE: Updating category via API', { category: updatedCategory });
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

      console.log('✅ ONLINE: Category updated successfully', { 
        request: updatedCategory,
        response: result 
      });

      if (result.success) {
        await refreshCategories();
      } else {
        console.error('❌ ONLINE: Failed to update category', { error: result.error });
        setError(result.error || 'Failed to update category');
      }
    } catch (error) {
      console.error('❌ ONLINE: Exception updating category', { error, category: updatedCategory });
      setError('Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!isOnline) {
      console.log('🔄 OFFLINE: Deleting category locally', {
        categoryId: id,
        queueLength: syncQueue.length
      });
      setCategories(prev => prev.filter(c => c.id !== id));
      await addToQueue({ type: 'deleteCategory', payload: { id }, timestamp: Date.now() });
      return;
    }

    console.log('🌐 ONLINE: Deleting category via API', { categoryId: id });
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiService.deleteCategory(id);

      console.log('✅ ONLINE: Category deleted successfully', { 
        request: { id },
        response: result 
      });

      if (result.success) {
        await refreshCategories();
      } else {
        console.error('❌ ONLINE: Failed to delete category', { error: result.error });
        setError(result.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('❌ ONLINE: Exception deleting category', { error, categoryId: id });
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
    if (!isOnline) {
      const tempId = generateObjectId();
      const payload = {
        ...transaction,
        id: tempId
      };
      console.log('🔄 OFFLINE: Adding transaction locally', {
        transaction: payload,
        queueLength: syncQueue.length
      });
      // update local state optimistically
      const newTransactions = [...transactions, payload];
      setTransactions(newTransactions);
      
      // Update account and category balances immediately when offline
      const updatedAccounts = updateAccountBalances(accounts, newTransactions);
      const updatedCategories = updateCategoryBalances(categories, newTransactions);
      setAccounts(updatedAccounts);
      setCategories(updatedCategories);
      
      await addToQueue({ type: 'addTransaction', payload, timestamp: Date.now() });
      return;
    }
    
    console.log('🌐 ONLINE: Creating transaction via API', { transaction });
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

      console.log('✅ ONLINE: Transaction created successfully', { 
        request: transaction,
        response: result 
      });

      if (result.success) {
        await refreshTransactions();
        // Note: Account balances will be automatically updated via the useEffect hook
        // when transactions are refreshed, ensuring consistency
      } else {
        console.error('❌ ONLINE: Failed to create transaction', { error: result.error });
        setError(result.error || 'Failed to create transaction');
      }
    } catch (error) {
      console.error('❌ ONLINE: Exception creating transaction', { error, transaction });
      setError('Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  const updateTransaction = async (updatedTransaction: Transaction) => {
    if (!isOnline) {
      console.log('🔄 OFFLINE: Updating transaction locally', {
        transaction: updatedTransaction,
        queueLength: syncQueue.length
      });
      // update local state optimistically
      const newTransactions = transactions.map(tx => tx.id === updatedTransaction.id ? updatedTransaction : tx);
      setTransactions(newTransactions);
      
      // Update account and category balances immediately when offline
      const updatedAccounts = updateAccountBalances(accounts, newTransactions);
      const updatedCategories = updateCategoryBalances(categories, newTransactions);
      setAccounts(updatedAccounts);
      setCategories(updatedCategories);
      
      await addToQueue({ type: 'updateTransaction', payload: { id: updatedTransaction.id, updates: updatedTransaction }, timestamp: Date.now() });
      return;
    }
    
    console.log('🌐 ONLINE: Updating transaction via API', { transaction: updatedTransaction });
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
        isDeleted: updatedTransaction.isDeleted,
      });

      console.log('✅ ONLINE: Transaction updated successfully', { 
        request: updatedTransaction,
        response: result 
      });

      if (result.success) {
        await refreshTransactions();
      } else {
        console.error('❌ ONLINE: Failed to update transaction', { error: result.error });
        setError(result.error || 'Failed to update transaction');
      }
    } catch (error) {
      console.error('❌ ONLINE: Exception updating transaction', { error, transaction: updatedTransaction });
      setError('Failed to update transaction');
    } finally {
      setLoading(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!isOnline) {
      console.log('🔄 OFFLINE: Deleting transaction locally', {
        transactionId: id,
        queueLength: syncQueue.length
      });
      // update local state optimistically
      const newTransactions = transactions.filter(tx => tx.id !== id);
      setTransactions(newTransactions);
      
      // Update account and category balances immediately when offline
      const updatedAccounts = updateAccountBalances(accounts, newTransactions);
      const updatedCategories = updateCategoryBalances(categories, newTransactions);
      setAccounts(updatedAccounts);
      setCategories(updatedCategories);
      
      await addToQueue({ type: 'deleteTransaction', payload: { id }, timestamp: Date.now() });
      return;
    }
    
    console.log('🌐 ONLINE: Deleting transaction via API', { transactionId: id });
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiService.deleteTransaction(id);

      console.log('✅ ONLINE: Transaction deleted successfully', { 
        request: { id },
        response: result 
      });

      if (result.success) {
        await refreshTransactions();
      } else {
        console.error('❌ ONLINE: Failed to delete transaction', { error: result.error });
        setError(result.error || 'Failed to delete transaction');
      }
    } catch (error) {
      console.error('❌ ONLINE: Exception deleting transaction', { error, transactionId: id });
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
         // Filter out deleted transactions
         const activeTransactions = result.data.filter(transaction => !transaction.isDeleted);
         return activeTransactions;
       }
       return [];
     } catch (error) {
       console.error('Failed to get transactions:', error);
       return [];
     }
   };

  // Manual function to recalculate account balances
  const recalculateAccountBalances = () => {
    console.log('🔄 MANUAL: Recalculating all account balances');
    const updatedAccounts = updateAccountBalances(accounts, transactions);
    setAccounts(updatedAccounts);
  };

  // Manual function to recalculate category balances
  const recalculateCategoryBalances = () => {
    console.log('🔄 MANUAL: Recalculating all category balances');
    const updatedCategories = updateCategoryBalances(categories, transactions);
    setCategories(updatedCategories);
  };

  // Manual function to recalculate all balances
  const recalculateAllBalances = () => {
    console.log('🔄 MANUAL: Recalculating all account and category balances');
    const updatedAccounts = updateAccountBalances(accounts, transactions);
    const updatedCategories = updateCategoryBalances(categories, transactions);
    setAccounts(updatedAccounts);
    setCategories(updatedCategories);
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
        recalculateAccountBalances,
        recalculateCategoryBalances,
        recalculateAllBalances,
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