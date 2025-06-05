import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
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

const formatCurrency = (amount: number) => {
  return `₱ ${Math.abs(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function Dashboard() {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [accounts, setAccounts] = useState<Account[]>([
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
  ]);
  
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const positiveAccounts = accounts.filter(account => account.balance >= 0);
  const negativeAccounts = accounts.filter(account => account.balance < 0);

  const handlePresentModal = () => {
    setSelectedAccount(null);
    setShowAccountForm(true);
  };

  const handleSaveAccount = (accountData: any) => {
    if (accountData.id) {
      // Update existing account
      setAccounts(accounts.map(acc => 
        acc.id === accountData.id ? { ...acc, ...accountData } : acc
      ));
    } else {
      // Add new account
      const newAccount: Account = {
        ...accountData,
        id: Date.now().toString(),
      };
      setAccounts([...accounts, newAccount]);
    }
    
    setShowAccountForm(false);
    setSelectedAccount(null);
  };

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setShowAccountForm(true);
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
          <Text style={styles.sectionTitle}>Accounts</Text>
          <Text style={styles.totalAmount}>₱ {totalBalance.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</Text>
        </View>

        <View style={styles.accountsContainer}>
          {positiveAccounts.map(account => (
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
                <Text style={styles.accountBalance}>
                  {formatCurrency(account.balance)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {negativeAccounts.map(account => (
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
                <View style={styles.creditCardInfo}>
                  <Text style={styles.negativeBalance}>
                    -{formatCurrency(account.balance)}
                  </Text>
                  <Text style={styles.creditLimit}>
                    ₱ {account.creditLimit?.toLocaleString('en-PH')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
  accountsContainer: {
    padding: 16,
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
}); 