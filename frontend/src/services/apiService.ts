import { Account } from '../contexts/DataContext';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  type?: 'Income' | 'Expense';
  parent?: string | null;
  subcategories?: Category[];
  transactions?: {
    direct: { total: number; count: number };
    subcategories: { total: number; count: number };
    all: { total: number; count: number };
  };
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

class ApiService {
  private baseUrl = 'https://yezfovq877.execute-api.ap-southeast-1.amazonaws.com/test/api';

  private async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: any;
      headers?: Record<string, string>;
    } = {}
  ): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {} } = options;
    
    console.log(`🌐 API Request: ${method} ${this.baseUrl}${endpoint}`, {
      method,
      endpoint,
      body,
      headers
    });
    
    try {
      const config: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      if (body) {
        config.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ API Error: ${method} ${endpoint}`, JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          errorData
        }));
        
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      console.log(`✅ API Success: ${method} ${endpoint}`, {
        response: data
      });
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error(`❌ API Exception: ${method} ${endpoint}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Account API methods
  async getAllAccounts(): Promise<ApiResponse<Account[]>> {
    return this.request<Account[]>('/account');
  }

  async getAccount(id: string): Promise<ApiResponse<Account>> {
    return this.request<Account>(`/account/${id}`);
  }

  async createAccount(account: Omit<Account, 'id'>): Promise<ApiResponse<{ data: Account; message: string }>> {
    return this.request<{ data: Account; message: string }>('/account', {
      method: 'POST',
      body: account,
    });
  }

  async updateAccount(id: string, account: Partial<Account>): Promise<ApiResponse<Account>> {
    return this.request<Account>(`/account/${id}`, {
      method: 'PUT',
      body: account,
    });
  }

  async deleteAccount(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/account/${id}`, {
      method: 'DELETE',
    });
  }

  async updateAccountsOrder(accounts: Array<{ id: string; order: number }>): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.request<{ success: boolean; message: string }>('/account/order', {
      method: 'POST',
      body: { accounts },
    });
  }

  // Category API methods
  async getAllCategories(): Promise<ApiResponse<Category[]>> {
    return this.request<Category[]>('/category');
  }

  async getCategory(id: string): Promise<ApiResponse<Category>> {
    return this.request<Category>(`/category/${id}`);
  }

  async createCategory(category: Omit<Category, 'id'>): Promise<ApiResponse<{ data: Category; message: string }>> {
    return this.request<{ data: Category; message: string }>('/category', {
      method: 'POST',
      body: category,
    });
  }

  async updateCategory(id: string, category: Partial<Category>): Promise<ApiResponse<Category>> {
    return this.request<Category>(`/category/${id}`, {
      method: 'PUT',
      body: category,
    });
  }

  async deleteCategory(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/category/${id}`, {
      method: 'DELETE',
    });
  }

  async getSubcategories(parentId: string): Promise<ApiResponse<Category[]>> {
    return this.request<Category[]>(`/category/${parentId}/subcategories`);
  }

  async getRootCategories(): Promise<ApiResponse<Category[]>> {
    return this.request<Category[]>('/category/root');
  }

  async getCategoryTransactions(categoryId: string, fromDate?: string, toDate?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    
    const queryString = params.toString();
    const endpoint = `/category/${categoryId}/transactions${queryString ? `?${queryString}` : ''}`;
    
    return this.request<any>(endpoint);
  }

  // Transaction API methods
  async getAllTransactions(params?: {
    fromAccount?: string;
    toAccount?: string;
    category?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<ApiResponse<Transaction[]>> {
    const queryParams = new URLSearchParams();
    if (params?.fromAccount) queryParams.append('fromAccount', params.fromAccount);
    if (params?.toAccount) queryParams.append('toAccount', params.toAccount);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);
    
    const queryString = queryParams.toString();
    const endpoint = `/transaction${queryString ? `?${queryString}` : ''}`;
    
    return this.request<Transaction[]>(endpoint);
  }

  async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    return this.request<Transaction>(`/transaction/${id}`);
  }

  async createTransaction(transaction: Omit<Transaction, 'id'>): Promise<ApiResponse<{ data: Transaction; message: string }>> {
    return this.request<{ data: Transaction; message: string }>('/transaction', {
      method: 'POST',
      body: transaction,
    });
  }

  async updateTransaction(id: string, transaction: Partial<Transaction>): Promise<ApiResponse<{ data: Transaction; message: string }>> {
    return this.request<{ data: Transaction; message: string }>(`/transaction/${id}`, {
      method: 'PUT',
      body: transaction,
    });
  }

  async deleteTransaction(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/transaction/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService(); 