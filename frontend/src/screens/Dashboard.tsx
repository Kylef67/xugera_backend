import React, { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import withObservables from '@nozbe/with-observables';
import { Model } from '@nozbe/watermelondb';
import { database, collections } from '../database';
import { syncService } from '../services/syncService';
import AddAccountDrawer from '../components/AddAccountDrawer';
import AccountForm from './AccountForm';

type Account = {
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

interface DashboardProps {
  accounts: Model[];
  transactions: Model[];
}

const formatCurrency = (amount: number) => {
  return `₱ ${Math.abs(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

function Dashboard({ accounts, transactions }: DashboardProps) {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(syncService.getConnectionStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Monitor sync status
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(syncService.getConnectionStatus());
      setIsSyncing(syncService.isSyncing());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-sync on app start
  useEffect(() => {
    const performInitialSync = async () => {
      if (syncService.getConnectionStatus()) {
        try {
          await syncService.syncData();
          setLastSyncTime(new Date());
        } catch (error) {
          console.log('Initial sync failed:', error);
        }
      }
    };

    performInitialSync();
  }, []);

  // Convert WatermelonDB accounts to display format
  const displayAccounts: Account[] = accounts.map((account: any) => ({
    id: account.id,
    name: account._raw.name || 'Unnamed Account',
    balance: 0, // You'll need to calculate this from transactions
    type: 'debit', // Default, you might want to add this field to your schema
    icon: 'credit-card',
    color: '#4CAF50',
    description: account._raw.description || '',
  }));

  const totalBalance = displayAccounts.reduce((sum, account) => sum + account.balance, 0);
  const positiveAccounts = displayAccounts.filter(account => account.balance >= 0);
  const negativeAccounts = displayAccounts.filter(account => account.balance < 0);

  const handlePresentModal = () => {
    setSelectedAccount(null);
    setShowAccountForm(true);
  };

  const handleSaveAccount = async (accountData: any) => {
    try {
      await database.write(async () => {
        if (accountData.id) {
          // Update existing account
          const account = await collections.accounts.find(accountData.id);
          await account.update((acc: any) => {
            acc._raw.name = accountData.name;
            acc._raw.description = accountData.description;
          });
        } else {
          // Create new account
          await collections.accounts.create((account: any) => {
            account._raw.name = accountData.name;
            account._raw.description = accountData.description;
            account._raw.created_at = Date.now();
            account._raw.updated_at = Date.now();
          });
        }
      });

      Alert.alert('Success', 'Account saved locally!');
      setShowAccountForm(false);
      setSelectedAccount(null);
      
      // Auto-sync if online
      if (isConnected) {
        try {
          await syncService.syncData();
          setLastSyncTime(new Date());
        } catch (error) {
          console.log('Sync after save failed:', error);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save account');
      console.error(error);
    }
  };

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setShowAccountForm(true);
  };

  const handleManualSync = async () => {
    if (!isConnected) {
      Alert.alert('Offline', 'Cannot sync while offline');
      return;
    }

    try {
      await syncService.forceSyncNow();
      setLastSyncTime(new Date());
      Alert.alert('Success', 'Sync completed!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Sync Failed', errorMessage);
    }
  };

  const handleAddSampleAccount = async () => {
    try {
      await database.write(async () => {
        await collections.accounts.create((account: any) => {
          account._raw.name = `Sample Account ${Date.now()}`;
          account._raw.description = 'Demo account for testing';
          account._raw.created_at = Date.now();
          account._raw.updated_at = Date.now();
        });
      });
      Alert.alert('Success', 'Sample account added!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add sample account');
      console.error('Sample account error:', error);
    }
  };

  if (showAccountForm) {
    return (
      <AccountForm 
        account={selectedAccount || undefined}
        onSave={handleSaveAccount}
        onCancel={() => {
          setShowAccountForm(false);
          setSelectedAccount(null);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.profileButton}>
          <MaterialCommunityIcons name="account-circle-outline" size={28} color="#8E8E93" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>All accounts</Text>
          <Text style={styles.headerBalance}>₱ {totalBalance.toLocaleString('en-PH')}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handlePresentModal}>
          <MaterialCommunityIcons name="plus" size={28} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      {/* Sync Status Bar */}
      <View style={styles.syncStatusBar}>
        <View style={styles.syncStatus}>
          <MaterialCommunityIcons 
            name={isConnected ? "wifi" : "wifi-off"} 
            size={16} 
            color={isConnected ? "#4CAF50" : "#FF4B8C"} 
          />
          <Text style={[styles.syncText, { color: isConnected ? "#4CAF50" : "#FF4B8C" }]}>
            {isConnected ? "Online" : "Offline"}
          </Text>
          {isSyncing && (
            <>
              <MaterialCommunityIcons name="sync" size={16} color="#6B8AFE" />
              <Text style={[styles.syncText, { color: "#6B8AFE" }]}>Syncing...</Text>
            </>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.syncButton, { opacity: isConnected && !isSyncing ? 1 : 0.5 }]}
          onPress={handleManualSync}
          disabled={!isConnected || isSyncing}
        >
          <MaterialCommunityIcons name="sync" size={16} color="#6B8AFE" />
          <Text style={styles.syncButtonText}>Sync</Text>
        </TouchableOpacity>
      </View>

      {lastSyncTime && (
        <View style={styles.lastSyncContainer}>
          <Text style={styles.lastSyncText}>
            Last sync: {lastSyncTime.toLocaleTimeString()}
          </Text>
        </View>
      )}

      <View style={[styles.tabBar, { justifyContent: 'center' }]}>
        <Pressable style={styles.tabActive}>
          <MaterialCommunityIcons name="wallet" size={24} color="#6B8AFE" />
          <Text style={styles.tabTextActive}>Accounts</Text>
        </Pressable>
        <Pressable style={styles.tab}>
          <MaterialCommunityIcons name="finance" size={24} color="#8E8E93" />
          <Text style={styles.tabText}>My finances</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Accounts ({accounts.length})</Text>
          <Text style={styles.totalAmount}>₱ {totalBalance.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</Text>
        </View>

        {/* Development Tools */}
        <View style={styles.devTools}>
          <TouchableOpacity style={styles.devButton} onPress={handleAddSampleAccount}>
            <Text style={styles.devButtonText}>+ Add Sample Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.accountsContainer}>
          {accounts.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="wallet-plus" size={64} color="#8E8E93" />
              <Text style={styles.emptyStateTitle}>No accounts yet</Text>
              <Text style={styles.emptyStateText}>
                Add your first account to start tracking your finances
              </Text>
              <TouchableOpacity style={styles.emptyStateButton} onPress={handlePresentModal}>
                <Text style={styles.emptyStateButtonText}>Add Account</Text>
              </TouchableOpacity>
            </View>
          ) : (
            displayAccounts.map(account => (
              <TouchableOpacity 
                key={account.id} 
                style={styles.accountCard}
                onPress={() => handleEditAccount(account)}
              >
                <View style={[styles.iconContainer, { backgroundColor: account.color }]}>
                  <MaterialCommunityIcons
                    name={account.icon as any}
                    size={24}
                    color="white"
                  />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.accountDescription}>{account.description}</Text>
                  <Text style={styles.accountBalance}>
                    {formatCurrency(account.balance)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Transaction Summary */}
        <View style={styles.transactionSummary}>
          <Text style={styles.sectionTitle}>Recent Transactions ({transactions.length})</Text>
          {transactions.slice(0, 3).map((transaction: any) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <Text style={styles.transactionAmount}>₱{transaction._raw.amount || 0}</Text>
              <Text style={styles.transactionDate}>
                {transaction._raw.transaction_date ? new Date(transaction._raw.transaction_date).toLocaleDateString() : 'No date'}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Enhanced with observables for real-time updates
const enhance = withObservables([], () => ({
  accounts: collections.accounts.query().observe(),
  transactions: collections.transactions.query().observe()
}));

export default enhance(Dashboard);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  profileButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#8E8E93',
    fontSize: 14,
  },
  headerBalance: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2C2C2E',
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncText: {
    marginLeft: 4,
    marginRight: 12,
    fontSize: 12,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#3C3C3E',
  },
  syncButtonText: {
    color: '#6B8AFE',
    marginLeft: 4,
    fontSize: 12,
  },
  lastSyncContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  lastSyncText: {
    color: '#8E8E93',
    fontSize: 11,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 16,
    opacity: 0.7,
  },
  tabActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#6B8AFE',
  },
  tabText: {
    color: '#8E8E93',
    marginLeft: 8,
    fontSize: 16,
  },
  tabTextActive: {
    color: '#6B8AFE',
    marginLeft: 8,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 24,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  devTools: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  devButton: {
    backgroundColor: '#3C3C3E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  devButtonText: {
    color: '#6B8AFE',
    fontSize: 14,
  },
  accountsContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#6B8AFE',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  accountCard: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 4,
  },
  accountDescription: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 4,
  },
  accountBalance: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  negativeBalance: {
    color: '#FF4B8C',
    fontSize: 16,
    fontWeight: 'bold',
  },
  creditCardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditLimit: {
    color: '#8E8E93',
    fontSize: 14,
  },
  transactionSummary: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3E',
  },
  transactionAmount: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionDate: {
    color: '#8E8E93',
    fontSize: 14,
  },
}); 