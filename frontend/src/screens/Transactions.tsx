import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateRangePicker, { DateRangeSelection } from '../components/DateRangePicker';
import AddTransactionDrawer from '../components/AddTransactionDrawer';
import { useData, Transaction, Account, Category } from '../contexts/DataContext';

const formatCurrency = (amount: number) => {
  return `₱ ${Math.abs(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const formatDate = (dateString: string) => {
  // Create a date object that represents the date in the local timezone
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
    // Parse the UTC date from the transaction
    const transactionDate = new Date(transaction.transactionDate);
    
    // Create a date object that represents the same date in the local timezone
    const localDate = new Date(transaction.transactionDate);
    
    // Extract year, month, day from the local date
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    
    console.log('Transaction date:', transaction.transactionDate, 
                'Parsed date:', transactionDate, 
                'Local date:', localDate,
                'Date key:', dateKey,
                'Note:', transaction.notes);
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(transaction);
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
  const { accounts, categories, transactions, getTransactions, addTransaction, updateTransaction, loading, error } = useData();
  const [dateSelection, setDateSelection] = useState<DateRangeSelection>(() => {
    const now = new Date();
    const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
                       'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
    
    return {
      mode: 'month',
      displayText: `${currentMonth} ${currentYear}`,
      displayNumber: daysInMonth.toString(),
    };
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
      let fromDate: string | undefined;
      let toDate: string | undefined;
      
      // Calculate date range based on selection
      if (dateSelection.mode === 'all-time') {
        // No date filtering for all-time
        fromDate = undefined;
        toDate = undefined;
      } else if (dateSelection.mode === 'date-range' && dateSelection.startDate && dateSelection.endDate) {
        fromDate = dateSelection.startDate.toISOString();
        toDate = new Date(dateSelection.endDate.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
      } else if (dateSelection.mode === 'today') {
        // Use the actual selected date from dateSelection
        if (dateSelection.startDate) {
          const selectedDate = new Date(dateSelection.startDate);
          // Create date objects for start and end of the selected day in local timezone
          const year = selectedDate.getFullYear();
          const month = selectedDate.getMonth();
          const day = selectedDate.getDate();
          
          // Set time to start of day (00:00:00) in local timezone, then convert to ISO string
          const startOfDay = new Date(year, month, day, 0, 0, 0);
          fromDate = startOfDay.toISOString();
          
          // Set time to end of day (23:59:59) in local timezone, then convert to ISO string
          const endOfDay = new Date(year, month, day, 23, 59, 59);
          toDate = endOfDay.toISOString();
          
          console.log('Today filter - Selected date:', selectedDate, 
                      'From date:', fromDate, 
                      'To date:', toDate);
        } else {
          // Fallback to current date if no startDate
          const today = new Date();
          const year = today.getFullYear();
          const month = today.getMonth();
          const day = today.getDate();
          
          const startOfDay = new Date(year, month, day, 0, 0, 0);
          fromDate = startOfDay.toISOString();
          
          const endOfDay = new Date(year, month, day, 23, 59, 59);
          toDate = endOfDay.toISOString();
        }
      } else if (dateSelection.mode === 'month') {
        // Parse the display text to get the actual month/year
        const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
                           'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
        const [monthName, yearStr] = dateSelection.displayText.split(' ');
        const selectedMonth = monthNames.indexOf(monthName);
        const selectedYear = parseInt(yearStr);
        
        fromDate = new Date(selectedYear, selectedMonth, 1).toISOString();
        toDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();
      } else if (dateSelection.mode === 'week') {
        // Use the actual selected week dates from dateSelection
        if (dateSelection.startDate && dateSelection.endDate) {
          fromDate = new Date(dateSelection.startDate.getFullYear(), dateSelection.startDate.getMonth(), dateSelection.startDate.getDate()).toISOString();
          toDate = new Date(dateSelection.endDate.getFullYear(), dateSelection.endDate.getMonth(), dateSelection.endDate.getDate(), 23, 59, 59).toISOString();
        } else {
          // Fallback to current week if no dates
          const now = new Date();
          const currentDay = now.getDay();
          const startOfWeek = new Date(now.getTime() - (currentDay * 24 * 60 * 60 * 1000));
          const endOfWeek = new Date(startOfWeek.getTime() + (6 * 24 * 60 * 60 * 1000));
          
          fromDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate()).toISOString();
          toDate = new Date(endOfWeek.getFullYear(), endOfWeek.getMonth(), endOfWeek.getDate(), 23, 59, 59).toISOString();
        }
      } else if (dateSelection.mode === 'day') {
        // Use the actual selected day from dateSelection
        if (dateSelection.startDate) {
          const selectedDate = new Date(dateSelection.startDate);
          // Create date objects for start and end of the selected day in local timezone
          const year = selectedDate.getFullYear();
          const month = selectedDate.getMonth();
          const day = selectedDate.getDate();
          
          // Set time to start of day (00:00:00) in local timezone, then convert to ISO string
          const startOfDay = new Date(year, month, day, 0, 0, 0);
          fromDate = startOfDay.toISOString();
          
          // Set time to end of day (23:59:59) in local timezone, then convert to ISO string
          const endOfDay = new Date(year, month, day, 23, 59, 59);
          toDate = endOfDay.toISOString();
          
          console.log('Day filter - Selected date:', selectedDate, 
                      'From date:', fromDate, 
                      'To date:', toDate);
        } else {
          // Fallback to current date if no startDate
          const today = new Date();
          const year = today.getFullYear();
          const month = today.getMonth();
          const day = today.getDate();
          
          const startOfDay = new Date(year, month, day, 0, 0, 0);
          fromDate = startOfDay.toISOString();
          
          const endOfDay = new Date(year, month, day, 23, 59, 59);
          toDate = endOfDay.toISOString();
        }
      } else if (dateSelection.mode === 'year') {
        // Add support for year mode
        let selectedYear: number;
        if (dateSelection.startDate) {
          selectedYear = dateSelection.startDate.getFullYear();
        } else {
          // Parse year from display text if available
          const yearMatch = dateSelection.displayText.match(/\d{4}/);
          selectedYear = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
        }
        
        fromDate = new Date(selectedYear, 0, 1).toISOString();
        toDate = new Date(selectedYear, 11, 31, 23, 59, 59).toISOString();
      }
      
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
    try {
      // Convert date field to transactionDate for API compatibility
      const transactionData = {
        ...transaction,
        transactionDate: transaction.date,
      };
      delete transactionData.date;

      console.log('Transaction date:', transactionData.transactionDate);

      if (editTransaction) {
        // Update existing transaction
        await updateTransaction(transactionData);
      } else {
        // Add new transaction
        await addTransaction(transactionData);
      }
    } catch (error) {
      console.error('Failed to save transaction:', error);
    } finally {
      setShowTransactionForm(false);
      setEditTransaction(undefined);
      await loadTransactions(); // Refresh transactions
    }
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

  const getAccountName = (accountId: string | Account) => {
    if (typeof accountId === 'object' && accountId !== null) {
      return accountId.name;
    }
    const account = accounts.find(acc => acc.id === accountId);
    return account?.name || 'Unknown Account';
  };

  const getCategoryName = (categoryId?: string | Category) => {
    if (!categoryId) return 'Transfer';
    if (typeof categoryId === 'object' && categoryId !== null) {
      return categoryId.name;
    }
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  const getTransactionAmountColor = (transaction: Transaction) => {
    if (transaction.type === 'income') {
      return '#4CAF50'; // Green for income
    } else if (transaction.type === 'expense') {
      return '#FF4B8C'; // Red for expense
    } else {
      return '#007AFF'; // Blue for transfer
    }
  };

  const getTransactionAmountDisplay = (transaction: Transaction) => {
    if (transaction.type === 'income') {
      return `+${formatCurrency(transaction.amount)}`;
    } else if (transaction.type === 'expense') {
      return `-${formatCurrency(transaction.amount)}`;
    } else {
      return formatCurrency(transaction.amount);
    }
  };

  const getTransactionAccountDisplay = (transaction: Transaction) => {
    if (transaction.type === 'transfer' && transaction.toAccount) {
      return `${getAccountName(transaction.fromAccount)} → ${getAccountName(transaction.toAccount)}`;
    } else {
      return getAccountName(transaction.fromAccount);
    }
  };

  // Convert DataContext Transaction to AddTransactionDrawer Transaction
  const convertToDrawerTransaction = (transaction: Transaction) => {
    // Extract IDs from populated objects if necessary
    const fromAccountId = typeof transaction.fromAccount === 'object' && transaction.fromAccount !== null
      ? (transaction.fromAccount as any).id 
      : transaction.fromAccount as string;
    const toAccountId = typeof transaction.toAccount === 'object' && transaction.toAccount !== null
      ? (transaction.toAccount as any).id 
      : transaction.toAccount as string | undefined;
    const categoryId = typeof transaction.category === 'object' && transaction.category !== null
      ? (transaction.category as any).id 
      : transaction.category as string | undefined;
    
    return {
      id: transaction.id,
      type: (transaction.type || (transaction.amount > 0 ? 'income' : 'expense')) as 'income' | 'expense' | 'transfer',
      amount: transaction.amount,
      fromAccount: fromAccountId || '',
      toAccount: toAccountId,
      category: categoryId,
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
          {item.description || getTransactionAccountDisplay(item)}
        </Text>
        {item.notes && (
          <Text style={styles.transactionNotes}>{item.notes}</Text>
        )}
      </View>
      <View style={styles.transactionAmountContainer}>
        <Text style={[
          styles.transactionAmount,
          { color: getTransactionAmountColor(item) }
        ]}>
          {getTransactionAmountDisplay(item)}
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
    const dayTotal = item.transactions.reduce((sum, t) => {
      if (t.type === 'income') {
        return sum + t.amount;
      } else if (t.type === 'expense') {
        return sum - t.amount;
      } else {
        // For transfers, don't affect the total
        return sum;
      }
    }, 0);
    
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
            {dayTotal >= 0 ? '+' : ''}{formatCurrency(Math.abs(dayTotal))}
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