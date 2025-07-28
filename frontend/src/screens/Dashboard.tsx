import React, { useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
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
    loading,
    error,
    isInitialized,
    isLoadingData,
    refreshData
  } = useData();
  
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'debit' | 'credit' | 'wallet'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter accounts based on search query and type filter
  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      // Apply search filter
      const matchesSearch = searchQuery === '' || 
        account.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Apply type filter
      const matchesType = accountTypeFilter === 'all' || account.type === accountTypeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [accounts, searchQuery, accountTypeFilter]);

  // Calculate total balance for filtered accounts
  const totalBalance = useMemo(() => {
    return filteredAccounts.reduce((sum, account) => {
      if (account.includeInTotal !== false) {
        return sum + account.balance;
      }
      return sum;
    }, 0);
  }, [filteredAccounts]);

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

  const handleDeleteAccount = (account: Account) => {
    Alert.alert(
      "Delete Account",
      `Are you sure you want to delete "${account.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            deleteAccount(account.id);
          }
        }
      ]
    );
  };

  const handleReorderAccounts = (reorderedAccounts: Account[]) => {
    reorderAccounts(reorderedAccounts);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
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
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleRefresh}
            disabled={isLoadingData}
          >
            <MaterialCommunityIcons 
              name={isLoadingData ? "loading" : "refresh"} 
              size={24} 
              color={isLoadingData ? "#8E8E93" : "#8E8E93"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity 
            style={[styles.filterButton, accountTypeFilter === 'all' && styles.filterButtonActive]} 
            onPress={() => setAccountTypeFilter('all')}
          >
            <Text style={[styles.filterButtonText, accountTypeFilter === 'all' && styles.filterButtonTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, accountTypeFilter === 'debit' && styles.filterButtonActive]} 
            onPress={() => setAccountTypeFilter('debit')}
          >
            <Text style={[styles.filterButtonText, accountTypeFilter === 'debit' && styles.filterButtonTextActive]}>Debit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, accountTypeFilter === 'credit' && styles.filterButtonActive]} 
            onPress={() => setAccountTypeFilter('credit')}
          >
            <Text style={[styles.filterButtonText, accountTypeFilter === 'credit' && styles.filterButtonTextActive]}>Credit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, accountTypeFilter === 'wallet' && styles.filterButtonActive]} 
            onPress={() => setAccountTypeFilter('wallet')}
          >
            <Text style={[styles.filterButtonText, accountTypeFilter === 'wallet' && styles.filterButtonTextActive]}>Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.searchFilterButton} 
            onPress={() => setShowSearch(!showSearch)}
          >
            <MaterialCommunityIcons 
              name="magnify" 
              size={20} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search accounts..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.sectionTitle}>
          {accountTypeFilter === 'all' ? 'Accounts' : `${accountTypeFilter.charAt(0).toUpperCase() + accountTypeFilter.slice(1)} Accounts`}
        </Text>
        <Text style={styles.totalAmount}>
          {formatCurrency(totalBalance)}
        </Text>
      </View>

      <View style={styles.accountsContainer}>
        {!isInitialized || isRefreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6B8AFE" />
          </View>
        ) : filteredAccounts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="wallet-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyText}>
              {searchQuery ? "No accounts match your search" : "No accounts found"}
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handlePresentModal}>
              <Text style={styles.emptyButtonText}>Add Account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <DraggableAccountList 
            accounts={filteredAccounts} 
            onReorder={handleReorderAccounts}
            onEditAccount={handleEditAccount}
            onDeleteAccount={handleDeleteAccount}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        )}
      </View>


      {/* Floating Add Button */}
      <TouchableOpacity style={styles.floatingButton} onPress={handlePresentModal}>
        <MaterialCommunityIcons name="plus" size={28} color="white" />
      </TouchableOpacity>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    backgroundColor: '#1C1C1E',
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
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  headerBalance: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    backgroundColor: '#1C1C1E',
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#6B8AFE',
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  filterButtonTextActive: {
    fontWeight: 'bold',
  },
  searchFilterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#2C2C2E',
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3C',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A3A3C',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#6B8AFE',
    borderRadius: 20,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  errorText: {
    color: '#FF4B8C',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6B8AFE',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
}); 