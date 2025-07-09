import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateRangePicker, { DateRangeSelection } from '../components/DateRangePicker';
import AddTransactionDrawer from '../components/AddTransactionDrawer';
import { useData } from '../contexts/DataContext';

type Transaction = {
  id: string;
  date: string;
  title: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  icon: string;
  iconColor: string;
  category: string;
  fromAccount: string;
  notes: string;
};

const formatCurrency = (amount: number) => {
  return `₱ ${Math.abs(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};



export default function Transactions() {
  const { accounts, categories } = useData();
  const [dateSelection, setDateSelection] = useState<DateRangeSelection>({
    mode: 'month',
    displayText: 'OCTOBER 2024',
    displayNumber: '31',
  });
  const [showScheduled, setShowScheduled] = useState(true);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | undefined>(undefined);
  const totalBalance = 213827;

  const scheduledTransactions: Transaction[] = [
    {
      id: '1',
      date: '02 OCTOBER 2024',
      title: 'Bills (65B)',
      description: 'PLDT',
      amount: -1700,
      type: 'expense',
      icon: 'flash',
      iconColor: '#FF4B8C',
      category: 'Bills',
      fromAccount: '1',
      notes: 'Monthly PLDT bill'
    },
    {
      id: '2',
      date: '02 OCTOBER 2024',
      title: 'Bills (65B)',
      description: 'Mamy Tax + Electricity + Water',
      amount: -8300,
      type: 'expense',
      icon: 'flash',
      iconColor: '#FF4B8C',
      category: 'Bills',
      fromAccount: '1',
      notes: 'Monthly utilities'
    }
  ];

  const transactions: Transaction[] = [
    {
      id: '3',
      date: '01 OCTOBER 2024',
      title: 'Groceries',
      description: 'Fish and gulay',
      amount: -850,
      type: 'expense',
      icon: 'cart',
      iconColor: '#4CAF50',
      category: 'Groceries',
      fromAccount: '1',
      notes: 'Weekly grocery shopping'
    }
  ];

  const scheduledTotal = scheduledTransactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

  const handleAddTransaction = (transaction: any) => {
    setShowTransactionForm(false);
    setEditTransaction(undefined);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditTransaction(transaction);
    setShowTransactionForm(true);
  };

  const handleOpenAddDrawer = () => {
    setEditTransaction(undefined);
    setShowTransactionForm(true);
  };

  const handleCancelTransaction = () => {
    setShowTransactionForm(false);
    setEditTransaction(undefined);
  };

  if (showTransactionForm) {
    return (
      <AddTransactionDrawer
        onSubmit={handleAddTransaction}
        onCancel={handleCancelTransaction}
        editTransaction={editTransaction}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.profileButton}>
          <MaterialCommunityIcons name="account-circle-outline" size={28} color="#8E8E93" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>All accounts</Text>
          <Text style={styles.headerBalance}>₱ {totalBalance.toLocaleString('en-PH')}</Text>
        </View>
        <TouchableOpacity style={styles.searchButton}>
          <MaterialCommunityIcons name="magnify" size={28} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      {/* Date Range Picker */}
      <DateRangePicker
        selection={dateSelection}
        onSelectionChange={setDateSelection}
       
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* Scheduled Transactions */}
        <TouchableOpacity 
          style={styles.scheduledHeader}
          onPress={() => setShowScheduled(!showScheduled)}
        >
          <MaterialCommunityIcons 
            name={showScheduled ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#8E8E93" 
          />
          <Text style={styles.scheduledTitle}>Scheduled 4 transactions</Text>
          <MaterialCommunityIcons 
            name={showScheduled ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#8E8E93" 
          />
        </TouchableOpacity>

        {showScheduled && (
          <View style={styles.scheduledSection}>
            <View style={styles.scheduledDateHeader}>
              <Text style={styles.scheduledDate}>02</Text>
              <View style={styles.scheduledDateInfo}>
                <Text style={styles.scheduledDateText}>YESTERDAY</Text>
                <Text style={styles.scheduledDateText}>OCTOBER 2024</Text>
              </View>
              <Text style={styles.scheduledAmount}>₱ {scheduledTotal.toLocaleString('en-PH')}</Text>
            </View>

            {scheduledTransactions.map((transaction) => (
              <TouchableOpacity 
                key={transaction.id} 
                style={styles.transactionItem}
                onPress={() => handleEditTransaction(transaction)}
              >
                <View style={[styles.transactionIcon, { backgroundColor: transaction.iconColor }]}>
                  <MaterialCommunityIcons
                    name={transaction.icon as any}
                    size={20}
                    color="white"
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>{transaction.title}</Text>
                  <Text style={styles.transactionDescription}>{transaction.description}</Text>
                </View>
                <Text style={styles.transactionAmount}>
                  ₱ {Math.abs(transaction.amount).toLocaleString('en-PH')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Regular Transactions */}
        <View style={styles.transactionSection}>
          <View style={styles.transactionDateHeader}>
            <Text style={styles.transactionDate}>01</Text>
            <View style={styles.transactionDateInfo}>
              <Text style={styles.transactionDateText}>TUESDAY</Text>
              <Text style={styles.transactionDateText}>OCTOBER 2024</Text>
            </View>
            <Text style={styles.transactionAmount}>₱ 850</Text>
          </View>

          {transactions.map((transaction) => (
            <TouchableOpacity 
              key={transaction.id} 
              style={styles.transactionItem}
              onPress={() => handleEditTransaction(transaction)}
            >
              <View style={[styles.transactionIcon, { backgroundColor: transaction.iconColor }]}>
                <MaterialCommunityIcons
                  name={transaction.icon as any}
                  size={20}
                  color="white"
                />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle}>{transaction.title}</Text>
                <Text style={styles.transactionDescription}>{transaction.description}</Text>
              </View>
              <Text style={styles.transactionAmount}>
                ₱ {Math.abs(transaction.amount).toLocaleString('en-PH')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Add some bottom padding for the floating button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.floatingButton} onPress={handleOpenAddDrawer}>
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
  searchButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scheduledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2C2C2E',
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    marginTop: 16,
  },
  scheduledTitle: {
    color: '#8E8E93',
    fontSize: 16,
    marginHorizontal: 12,
  },
  scheduledSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  scheduledDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    marginBottom: 8,
  },
  scheduledDate: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 16,
  },
  scheduledDateInfo: {
    flex: 1,
  },
  scheduledDateText: {
    color: '#8E8E93',
    fontSize: 12,
  },
  scheduledAmount: {
    color: '#FF4B8C',
    fontSize: 18,
    fontWeight: 'bold',
  },
  transactionSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  transactionDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    marginBottom: 8,
  },
  transactionDate: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 16,
  },
  transactionDateInfo: {
    flex: 1,
  },
  transactionDateText: {
    color: '#8E8E93',
    fontSize: 12,
  },
  transactionAmount: {
    color: '#FF4B8C',
    fontSize: 18,
    fontWeight: 'bold',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  transactionDescription: {
    color: '#8E8E93',
    fontSize: 14,
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