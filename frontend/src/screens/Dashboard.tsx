import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AddAccountDrawer from '../components/AddAccountDrawer';
import AccountForm from './AccountForm';
import { useData, Account } from '../contexts/DataContext';
import { generateObjectId } from '../utils/objectId';
import DraggableAccountList from '../components/DraggableAccountList';
import { formatCurrency } from '../utils/formatters';

export default function Dashboard() {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const { 
    accounts, 
    addAccount, 
    updateAccount, 
    deleteAccount, 
    reorderAccounts,
    isOnline, 
    isSyncing, 
    lastSyncResult, 
    syncData 
  } = useData();
  
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const totalBalance = accounts.reduce((sum, account) => {
    if (account.includeInTotal !== false) {
      return sum + account.balance;
    }
    return sum;
  }, 0);

  const handlePresentModal = () => {
    setSelectedAccount(null);
    setShowAccountForm(true);
  };

  const handleSaveAccount = (accountData: any) => {
    if (accountData.id) {
      // Update existing account
      updateAccount({ ...accountData });
    } else {
      // Add new account
      const newAccount: Account = {
        ...accountData,
        id: generateObjectId(),
      };
      addAccount(newAccount);
    }
    
    setShowAccountForm(false);
    setSelectedAccount(null);
  };

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setShowAccountForm(true);
  };

  const handleReorderAccounts = (reorderedAccounts: Account[]) => {
    reorderAccounts(reorderedAccounts);
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
          <View style={styles.syncStatusContainer}>
            <MaterialCommunityIcons 
              name={isOnline ? "wifi" : "wifi-off"} 
              size={16} 
              color={isOnline ? "#4CAF50" : "#FF4B8C"} 
            />
            <Text style={[styles.syncStatus, { color: isOnline ? "#4CAF50" : "#FF4B8C" }]}>
              {isOnline ? "Online" : "Offline"}
            </Text>
            {isSyncing && <MaterialCommunityIcons name="sync" size={16} color="#6B8AFE" />}
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.syncButton} 
            onPress={() => syncData(true)}
            disabled={!isOnline || isSyncing}
          >
            <MaterialCommunityIcons 
              name={isSyncing ? "sync" : "sync"} 
              size={24} 
              color={!isOnline || isSyncing ? "#8E8E93" : "#6B8AFE"} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={handlePresentModal}>
            <MaterialCommunityIcons name="plus" size={28} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </View>

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

      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Accounts</Text>
        <Text style={styles.totalAmount}>
          {formatCurrency(totalBalance)}
        </Text>
      </View>

      <View style={styles.accountsContainer}>
        <DraggableAccountList 
          accounts={accounts} 
          onReorder={handleReorderAccounts}
          onEditAccount={handleEditAccount}
        />
      </View>
      
      {lastSyncResult && (
        <View style={[styles.syncResult, { backgroundColor: lastSyncResult.success ? '#4CAF50' : '#FF4B8C' }]}>
          <Text style={styles.syncResultText}>
            {lastSyncResult.success 
              ? `Synced successfully. ${lastSyncResult.pulledCount || 0} pulled, ${lastSyncResult.pushedCount || 0} pushed.`
              : `Sync failed: ${lastSyncResult.error}`
            }
          </Text>
        </View>
      )}
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
  syncStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  syncStatus: {
    fontSize: 12,
    marginLeft: 4,
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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
    borderRadius: 8,
  },
  tabActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(107, 138, 254, 0.1)',
  },
  tabText: {
    color: '#8E8E93',
    marginLeft: 8,
  },
  tabTextActive: {
    color: '#6B8AFE',
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  totalAmount: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  accountsContainer: {
    flex: 1,
  },
  syncResult: {
    padding: 12,
    alignItems: 'center',
  },
  syncResultText: {
    color: 'white',
    fontWeight: '500',
  },
}); 