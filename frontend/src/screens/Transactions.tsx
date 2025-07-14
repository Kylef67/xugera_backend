import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateRangePicker, { DateRangeSelection } from '../components/DateRangePicker';
import AddTransactionDrawer from '../components/AddTransactionDrawer';
import { useData, Transaction } from '../contexts/DataContext';

const formatCurrency = (amount: number) => {
  return `₱ ${Math.abs(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return {
    day: date.getDate().toString().padStart(2, '0'),
    weekday: date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
    month: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase(),
  };
};

const groupTransactionsByDate = (transactions: Transaction[]) => {
  const grouped: { [date: string]: Transaction[] } = {};
  
  transactions.forEach(transaction => {
    const date = transaction.transactionDate.split('T')[0]; // Get date part only
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(transaction);
  });
  
  return Object.entries(grouped)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([date, transactions]) => ({
      date,
      transactions: transactions.sort((a, b) => 
        new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
      ),
    }));
};

export default function Transactions() {
  const { accounts, categories, transactions, getTransactions, loading, error } = useData();
  const [dateSelection, setDateSelection] = useState<DateRangeSelection>({
    mode: 'month',
    displayText: 'OCTOBER 2024',
    displayNumber: '31',
  });
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | undefined>(undefined);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [totalBalance, setTotalBalance] = useState(213827);

  useEffect(() => {
    loadTransactions();
  }, [dateSelection]);

  const loadTransactions = async () => {
    try {
      // Calculate date range based on selection
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const fromDate = new Date(currentYear, currentMonth, 1).toISOString();
      const toDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
      
      const result = await getTransactions({
        fromDate,
        toDate,
      });
      
      setFilteredTransactions(result);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const handleAddTransaction = async (transaction: any) => {
    setShowTransactionForm(false);
    setEditTransaction(undefined);
    await loadTransactions(); // Refresh transactions
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

  const groupedTransactions = groupTransactionsByDate(filteredTransactions);

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.category) {
      const category = categories.find(cat => cat.id === transaction.category);
      return category?.icon || 'cash';
    }
    return transaction.amount > 0 ? 'plus-circle' : 'minus-circle';
  };

  const getTransactionColor = (transaction: Transaction) => {
    if (transaction.category) {
      const category = categories.find(cat => cat.id === transaction.category);
      return category?.color || (transaction.amount > 0 ? '#4CAF50' : '#FF4B8C');
    }
    return transaction.amount > 0 ? '#4CAF50' : '#FF4B8C';
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account?.name || 'Unknown Account';
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'Transfer';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  // Convert DataContext Transaction to AddTransactionDrawer Transaction
  const convertToDrawerTransaction = (transaction: Transaction) => {
    return {
      id: transaction.id,
      type: (transaction.type || (transaction.amount > 0 ? 'income' : 'expense')) as 'income' | 'expense' | 'transfer',
      amount: transaction.amount,
      fromAccount: transaction.fromAccount,
      toAccount: transaction.toAccount,
      category: transaction.category,
      notes: transaction.notes || '',
      date: transaction.transactionDate,
    };
  };

  if (showTransactionForm) {
    return (
      <AddTransactionDrawer
        onSubmit={handleAddTransaction}
        onCancel={handleCancelTransaction}
        editTransaction={editTransaction ? convertToDrawerTransaction(editTransaction) : undefined}
      />
    );
  }

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity 
      style={styles.transactionItem}
      onPress={() => handleEditTransaction(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(item) }]}>
        <MaterialCommunityIcons
          name={getTransactionIcon(item) as any}
          size={22}
          color="white"
        />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionTitle}>{getCategoryName(item.category)}</Text>
        <Text style={styles.transactionDescription}>
          {item.description || getAccountName(item.fromAccount)}
        </Text>
        {item.notes && (
          <Text style={styles.transactionNotes}>{item.notes}</Text>
        )}
      </View>
      <View style={styles.transactionAmountContainer}>
        <Text style={[
          styles.transactionAmount,
          { color: item.amount > 0 ? '#4CAF50' : '#FF4B8C' }
        ]}>
          {item.amount > 0 ? '+' : ''}{formatCurrency(item.amount)}
        </Text>
        <Text style={styles.transactionTime}>
          {new Date(item.transactionDate).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderDateGroup = ({ item }: { item: { date: string; transactions: Transaction[] } }) => {
    const dateInfo = formatDate(item.date);
    const dayTotal = item.transactions.reduce((sum, t) => sum + t.amount, 0);
    
    return (
      <View style={styles.dateGroup}>
        <View style={styles.dateHeader}>
          <Text style={styles.dateNumber}>{dateInfo.day}</Text>
          <View style={styles.dateInfo}>
            <Text style={styles.dateWeekday}>{dateInfo.weekday}</Text>
            <Text style={styles.dateMonth}>{dateInfo.month}</Text>
          </View>
          <Text style={[
            styles.dateTotalAmount,
            { color: dayTotal >= 0 ? '#4CAF50' : '#FF4B8C' }
          ]}>
            {dayTotal >= 0 ? '+' : ''}{formatCurrency(dayTotal)}
          </Text>
        </View>
        
        <FlatList
          data={item.transactions}
          renderItem={renderTransactionItem}
          keyExtractor={(transaction) => transaction.id}
          scrollEnabled={false}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
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
        <TouchableOpacity style={styles.searchButton}>
          <MaterialCommunityIcons name="magnify" size={28} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      {/* Date Range Picker */}
      <DateRangePicker
        selection={dateSelection}
        onSelectionChange={setDateSelection}
      />

      {/* Transactions List */}
      <FlatList
        data={groupedTransactions}
        renderItem={renderDateGroup}
        keyExtractor={(item) => item.date}
        style={styles.transactionsList}
        contentContainerStyle={styles.transactionsContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadTransactions}
      />

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
    backgroundColor: '#1C1C1E',
  },
  header: {
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
    fontWeight: '400',
  },
  headerBalance: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#FF4B8C',
    textAlign: 'center',
    marginTop: 4,
  },
  searchButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionsList: {
    flex: 1,
  },
  transactionsContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    marginBottom: 12,
  },
  dateNumber: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginRight: 16,
    minWidth: 40,
  },
  dateInfo: {
    flex: 1,
  },
  dateWeekday: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  dateMonth: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '400',
  },
  dateTotalAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionDescription: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '400',
  },
  transactionNotes: {
    color: '#6B6B6B',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionTime: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '400',
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