import { Account } from '../contexts/DataContext';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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
    try {
      const { method = 'GET', body, headers = {} } = options;
      
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
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
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
}

export const apiService = new ApiService(); 