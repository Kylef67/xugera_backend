import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Pressable, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { syncService } from '../services/syncService';
import { storageService, Account } from '../services/storageService';
import { useAccounts } from '../hooks/useAccounts';
import AddAccountDrawer from '../components/AddAccountDrawer';
import AccountForm from './AccountForm';

const formatCurrency = (amount: number) => {
  return `₱ ${Math.abs(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function Dashboard() {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isConnected, setIsConnected] = useState(syncService.getConnectionStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const { 
    accounts, 
    loading, 
    addAccount, 
    updateAccount, 
    deleteAccount, 
    refreshAccounts,
    reorderAccounts
  } = useAccounts();

  // Monitor sync status
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(syncService.getConnectionStatus());
      setIsSyncing(syncService.isSyncing());
    }, 1000);

    // Load last sync time
    storageService.getLastSyncTime().then(setLastSyncTime);

    return () => clearInterval(interval);
  }, []);

  // Auto-sync on app start
  useEffect(() => {
    const performInitialSync = async () => {
      if (syncService.getConnectionStatus()) {
        try {
          await syncService.syncData();
          const syncTime = await storageService.getLastSyncTime();
          setLastSyncTime(syncTime);
        } catch (error) {
          console.log('Initial sync failed:', error);
        }
      }
    };

    performInitialSync();
  }, []);

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  const handlePresentModal = () => {
    setSelectedAccount(null);
    setShowAccountForm(true);
  };

  const handleSaveAccount = async (accountData: any) => {
    try {
      if (accountData.id) {
        // Update existing account
        await updateAccount(accountData.id, {
          name: accountData.name,
          description: accountData.description,
        });
      } else {
        // Create new account
        await addAccount({
          name: accountData.name,
          description: accountData.description,
        });
      }

      Alert.alert('Success', 'Account saved locally!');
      setShowAccountForm(false);
      setSelectedAccount(null);
      
      // Update last sync time if sync was successful
      const syncTime = await storageService.getLastSyncTime();
      setLastSyncTime(syncTime);
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
      const syncTime = await storageService.getLastSyncTime();
      setLastSyncTime(syncTime);
      await refreshAccounts();
      Alert.alert('Success', 'Sync completed!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Sync Failed', errorMessage);
    }
  };

  const handleAddSampleAccount = async () => {
    try {
      await addAccount({
        name: `Sample Account ${Date.now()}`,
        description: 'Demo account for testing',
        balance: Math.floor(Math.random() * 10000),
        type: 'debit',
        icon: 'wallet',
        color: '#4CAF50'
      });
      Alert.alert('Success', 'Sample account added!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add sample account');
      console.error('Sample account error:', error);
    }
  };

  // Handle drag and drop reordering
  const handleReorder = async ({ data }: { data: Account[] }) => {
    try {
      await reorderAccounts(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to reorder accounts');
      console.error('Reorder error:', error);
    }
  };

  // Move account up in order
  const moveAccountUp = async (account: Account) => {
    const currentIndex = accounts.findIndex(acc => acc.id === account.id);
    if (currentIndex > 0) {
      const newAccounts = [...accounts];
      [newAccounts[currentIndex - 1], newAccounts[currentIndex]] = [newAccounts[currentIndex], newAccounts[currentIndex - 1]];
      await reorderAccounts(newAccounts);
    }
  };

  // Move account down in order  
  const moveAccountDown = async (account: Account) => {
    const currentIndex = accounts.findIndex(acc => acc.id === account.id);
    if (currentIndex < accounts.length - 1) {
      const newAccounts = [...accounts];
      [newAccounts[currentIndex], newAccounts[currentIndex + 1]] = [newAccounts[currentIndex + 1], newAccounts[currentIndex]];
      await reorderAccounts(newAccounts);
    }
  };

  // Render account item for draggable list
  const renderAccountItem = useCallback(({ item: account, drag, isActive }: RenderItemParams<Account>) => {
    const currentIndex = accounts.findIndex(acc => acc.id === account.id);
    
    return (
      <TouchableOpacity 
        style={[
          styles.accountCard,
          isActive && styles.accountCardActive
        ]}
        onPress={() => handleEditAccount(account)}
        onLongPress={Platform.OS !== 'web' ? drag : undefined}
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
          {!account.synced && (
            <Text style={styles.unsyncedIndicator}>● Unsynced</Text>
          )}
        </View>
        
        {/* Web: Show arrow buttons, Mobile: Show drag handle */}
        {Platform.OS === 'web' ? (
          <View style={styles.webControls}>
            <TouchableOpacity 
              style={[styles.webButton, currentIndex === 0 && styles.webButtonDisabled]}
              onPress={() => moveAccountUp(account)}
              disabled={currentIndex === 0}
            >
              <MaterialCommunityIcons name="chevron-up" size={20} color={currentIndex === 0 ? "#555" : "#8E8E93"} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.webButton, currentIndex === accounts.length - 1 && styles.webButtonDisabled]}
              onPress={() => moveAccountDown(account)}
              disabled={currentIndex === accounts.length - 1}
            >
              <MaterialCommunityIcons name="chevron-down" size={20} color={currentIndex === accounts.length - 1 ? "#555" : "#8E8E93"} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.dragHandle}>
            <MaterialCommunityIcons 
              name="drag" 
              size={24} 
              color={isActive ? "#6B8AFE" : "#8E8E93"} 
            />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [accounts, moveAccountUp, moveAccountDown]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#6B8AFE" />
          <Text style={styles.loadingText}>Loading accounts...</Text>
        </View>
      </SafeAreaView>
    );
  }

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

      <View style={styles.scrollView}>
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
          {Platform.OS === 'web' && (
            <Text style={styles.webNote}>
              💡 On web: Use ↑↓ arrows to reorder accounts
            </Text>
          )}
        </View>

        {/* Accounts List */}
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
          <DraggableFlatList
            data={accounts}
            onDragEnd={handleReorder}
            keyExtractor={(item) => item.id}
            renderItem={renderAccountItem}
            containerStyle={styles.draggableList}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

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
  accountCardActive: {
    backgroundColor: '#3C3C3E',
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
  unsyncedIndicator: {
    color: '#FF4B8C',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
  },
  dragHandle: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  draggableList: {
    padding: 16,
  },
  webControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webButton: {
    padding: 8,
  },
  webButtonDisabled: {
    opacity: 0.5,
  },
  webNote: {
    color: '#8E8E93',
    marginLeft: 8,
    fontSize: 12,
  },
}); 