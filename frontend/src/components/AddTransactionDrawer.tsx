import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateRangePicker, { DateRangeSelection } from './DateRangePicker';
import { useData, Account, Category } from '../contexts/DataContext';

type TransactionType = 'income' | 'expense' | 'transfer';

interface Transaction {
  id?: string;
  type: TransactionType;
  amount: number;
  fromAccount: string;
  toAccount?: string;
  category?: string;
  notes: string;
  date: string;
}

interface AddTransactionDrawerProps {
  onSubmit: (transaction: Transaction) => void;
  onCancel: () => void;
  editTransaction?: Transaction;
}

const formatCurrency = (amount: number) => {
  return `₱ ${Math.abs(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

export default function AddTransactionDrawer({
  onSubmit,
  onCancel,
  editTransaction,
}: AddTransactionDrawerProps) {
  const { accounts, categories } = useData();
  const [transactionType, setTransactionType] = useState<TransactionType>(
    editTransaction?.type || 'expense'
  );
  const [amount, setAmount] = useState(editTransaction?.amount?.toString() || '');
  const [fromAccount, setFromAccount] = useState(editTransaction?.fromAccount || '');
  const [toAccount, setToAccount] = useState(editTransaction?.toAccount || '');
  const [category, setCategory] = useState(editTransaction?.category || '');
  const [notes, setNotes] = useState(editTransaction?.notes || '');
  const [dateSelection, setDateSelection] = useState<DateRangeSelection>({
    mode: 'day',
    startDate: editTransaction?.date ? new Date(editTransaction.date) : new Date(),
    endDate: editTransaction?.date ? new Date(editTransaction.date) : new Date(),
    displayText: editTransaction?.date 
      ? new Date(editTransaction.date).toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : new Date().toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
  });
  const [showFromAccountModal, setShowFromAccountModal] = useState(false);
  const [showToAccountModal, setShowToAccountModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const handleAmountChange = (text: string) => {
    // Allow only numbers and decimal point
    const numericValue = text.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit decimal places to 2
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    setAmount(numericValue);
  };



  const handleSubmit = () => {
    const transaction: Transaction = {
      id: editTransaction?.id,
      type: transactionType,
      amount: parseFloat(amount) || 0,
      fromAccount,
      toAccount: transactionType === 'transfer' ? toAccount : undefined,
      category: transactionType !== 'transfer' ? category : undefined,
      notes,
      date: dateSelection.startDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
    };

    onSubmit(transaction);
  };

  const handleDateSelect = (selectedDate: Date) => {
    const newSelection: DateRangeSelection = {
      mode: 'day',
      startDate: selectedDate,
      endDate: selectedDate,
      displayText: selectedDate.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    };
    setDateSelection(newSelection);
    setShowDatePicker(false);
  };

  const renderCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const selectedDate = dateSelection.startDate;

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const isSelected = selectedDate && 
        currentDate.toDateString() === selectedDate.toDateString();
      const isToday = currentDate.toDateString() === new Date().toDateString();
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isSelected && styles.selectedDay,
            isToday && !isSelected && styles.todayDay
          ]}
          onPress={() => handleDateSelect(currentDate)}
        >
          <Text style={[
            styles.calendarDayText,
            isSelected && styles.selectedDayText,
            isToday && !isSelected && styles.todayDayText
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return days;
  };

  const filteredCategories = categories.filter(cat => 
    transactionType === 'income' ? cat.type === 'Income' : cat.type === 'Expense'
  );

  const selectedFromAccount = accounts.find(acc => acc.id === fromAccount);
  const selectedToAccount = accounts.find(acc => acc.id === toAccount);
  const selectedCategory = categories.find(cat => cat.id === category);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {editTransaction ? 'Edit Transaction' : 'Add Transaction'}
        </Text>
        <TouchableOpacity onPress={handleSubmit} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.form} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        <View style={styles.typeContainer}>
          {(['income', 'expense', 'transfer'] as TransactionType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                transactionType === type && styles.typeButtonActive,
              ]}
              onPress={() => setTransactionType(type)}
            >
              <MaterialCommunityIcons
                name={
                  type === 'income' ? 'arrow-up' : 
                  type === 'expense' ? 'arrow-down' : 
                  'arrow-left-right'
                }
                size={20}
                color={transactionType === type ? '#FFFFFF' : '#8E8E93'}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  transactionType === type && styles.typeButtonTextActive,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>From Account</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowFromAccountModal(true)}
          >
            <View style={styles.selectContent}>
              {selectedFromAccount ? (
                <>
                  <View style={styles.accountIcon}>
                    <MaterialCommunityIcons
                      name={selectedFromAccount.icon as any}
                      size={24}
                      color="#6B8AFE"
                    />
                  </View>
                  <View style={styles.selectTextContainer}>
                    <Text style={styles.selectText}>{selectedFromAccount.name}</Text>
                    <Text style={styles.selectSubText}>
                      {formatCurrency(selectedFromAccount.balance)}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={styles.selectPlaceholder}>Select account</Text>
              )}
              <MaterialCommunityIcons name="chevron-down" size={24} color="#8E8E93" />
            </View>
          </TouchableOpacity>
        </View>

        {transactionType === 'transfer' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>To Account</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowToAccountModal(true)}
            >
              <View style={styles.selectContent}>
                {selectedToAccount ? (
                  <>
                    <View style={styles.accountIcon}>
                      <MaterialCommunityIcons
                        name={selectedToAccount.icon as any}
                        size={24}
                        color="#6B8AFE"
                      />
                    </View>
                    <View style={styles.selectTextContainer}>
                      <Text style={styles.selectText}>{selectedToAccount.name}</Text>
                      <Text style={styles.selectSubText}>
                        {formatCurrency(selectedToAccount.balance)}
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.selectPlaceholder}>Select account</Text>
                )}
                <MaterialCommunityIcons name="chevron-down" size={24} color="#8E8E93" />
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowCategoryModal(true)}
            >
              <View style={styles.selectContent}>
                {selectedCategory ? (
                  <>
                    <View style={[styles.categoryIconSmall, { backgroundColor: selectedCategory.color }]}>
                      <MaterialCommunityIcons
                        name={selectedCategory.icon as any}
                        size={20}
                        color="#FFFFFF"
                      />
                    </View>
                    <View style={styles.selectTextContainer}>
                      <Text style={styles.selectText}>{selectedCategory.name}</Text>
                      <Text style={styles.selectSubText}>{selectedCategory.type}</Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.selectPlaceholder}>Select category</Text>
                )}
                <MaterialCommunityIcons name="chevron-down" size={24} color="#8E8E93" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {transactionType === 'income' ? 'Income' : 
             transactionType === 'expense' ? 'Expense' : 'Transfer'}
          </Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="Enter amount"
            placeholderTextColor="#8E8E93"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes..."
            placeholderTextColor="#8E8E93"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialCommunityIcons name="calendar" size={24} color="#8E8E93" />
            <Text style={styles.dateText}>
              {dateSelection.displayText}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {editTransaction && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.deleteButton}>
              <MaterialCommunityIcons name="delete" size={24} color="#FF4B8C" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.duplicateButton}>
              <MaterialCommunityIcons name="content-copy" size={24} color="#6B8AFE" />
              <Text style={styles.duplicateButtonText}>Duplicate</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Account Selection Modals */}
      <Modal
        visible={showFromAccountModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFromAccountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select From Account</Text>
              <TouchableOpacity onPress={() => setShowFromAccountModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {accounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setFromAccount(account.id);
                    setShowFromAccountModal(false);
                  }}
                >
                  <View style={[styles.accountIcon, { backgroundColor: account.color }]}>
                    <MaterialCommunityIcons
                      name={account.icon as any}
                      size={24}
                      color="white"
                    />
                  </View>
                  <View style={styles.modalItemText}>
                    <Text style={styles.modalItemName}>{account.name}</Text>
                    <Text style={styles.modalItemBalance}>
                      {formatCurrency(account.balance)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showToAccountModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowToAccountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select To Account</Text>
              <TouchableOpacity onPress={() => setShowToAccountModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {accounts.filter(acc => acc.id !== fromAccount).map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setToAccount(account.id);
                    setShowToAccountModal(false);
                  }}
                >
                  <View style={[styles.accountIcon, { backgroundColor: account.color }]}>
                    <MaterialCommunityIcons
                      name={account.icon as any}
                      size={24}
                      color="white"
                    />
                  </View>
                  <View style={styles.modalItemText}>
                    <Text style={styles.modalItemName}>{account.name}</Text>
                    <Text style={styles.modalItemBalance}>
                      {formatCurrency(account.balance)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {filteredCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setCategory(cat.id);
                    setShowCategoryModal(false);
                  }}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: cat.color }]}>
                    <MaterialCommunityIcons
                      name={cat.icon as any}
                      size={24}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.modalItemText}>
                    <Text style={styles.modalItemName}>{cat.name}</Text>
                    <Text style={styles.modalItemBalance}>{cat.type}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => {
                  const newMonth = new Date(calendarMonth);
                  newMonth.setMonth(calendarMonth.getMonth() - 1);
                  setCalendarMonth(newMonth);
                }}>
                  <MaterialCommunityIcons name="chevron-left" size={24} color="#8E8E93" />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>
                  {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity onPress={() => {
                  const newMonth = new Date(calendarMonth);
                  newMonth.setMonth(calendarMonth.getMonth() + 1);
                  setCalendarMonth(newMonth);
                }}>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.weekDaysHeader}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <Text key={index} style={styles.weekDayText}>{day}</Text>
                ))}
              </View>
              
              <View style={styles.calendarGrid}>
                {renderCalendarDays()}
              </View>
              
              <View style={styles.quickDateOptions}>
                <TouchableOpacity 
                  style={styles.quickDateButton}
                  onPress={() => handleDateSelect(new Date())}
                >
                  <Text style={styles.quickDateText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickDateButton}
                  onPress={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    handleDateSelect(yesterday);
                  }}
                >
                  <Text style={styles.quickDateText}>Yesterday</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    color: '#6B8AFE',
    fontSize: 16,
    fontWeight: 'bold',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  form: {
    flex: 1,
    padding: 16,
  },
  formContent: {
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: '#6B8AFE',
  },
  typeButtonText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },

  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },


  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
  },
  amountText: {
    color: '#6B8AFE',
    fontSize: 32,
    fontWeight: 'bold',
  },
  numPadContainer: {
    marginTop: 16,
  },
  numPadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  numPadButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numPadButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '500',
  },
  notesInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    gap: 12,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    gap: 8,
  },
  deleteButtonText: {
    color: '#FF4B8C',
    fontSize: 16,
  },
  duplicateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    gap: 8,
  },
  duplicateButtonText: {
    color: '#6B8AFE',
    fontSize: 16,
  },
  selectButton: {
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 16,
  },
  selectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  selectText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 2,
  },
  selectSubText: {
    color: '#8E8E93',
    fontSize: 14,
  },
  selectPlaceholder: {
    color: '#8E8E93',
    fontSize: 16,
  },
  amountInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 24,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '70%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalContent: {
    maxHeight: 300,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalItemText: {
    flex: 1,
    marginLeft: 12,
  },
  modalItemName: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 2,
  },
  modalItemBalance: {
    color: '#8E8E93',
    fontSize: 14,
  },
  datePickerContent: {
    padding: 16,
  },
  calendarModalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
  },
  calendarContainer: {
    padding: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  weekDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  weekDayText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectedDay: {
    backgroundColor: '#6B8AFE',
    borderRadius: 20,
  },
  todayDay: {
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
  },
  calendarDayText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  todayDayText: {
    color: '#6B8AFE',
    fontWeight: '500',
  },
  quickDateOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
  },
  quickDateButton: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  quickDateText: {
    color: '#6B8AFE',
    fontSize: 16,
    fontWeight: '500',
  },
}); 