import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, ScrollView, Modal, StatusBar, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type AccountFormProps = {
  account?: {
    id: string;
    name: string;
    balance: number;
    type: 'debit' | 'credit' | 'wallet';
    icon: string;
    color: string;
    creditLimit?: number;
    description?: string;
    includeInTotal?: boolean;
  };
  onSave: (account: any) => void;
  onCancel: () => void;
};

const accountTypes = [
  { id: 'debit', name: 'Regular', icon: 'credit-card-outline' },
  { id: 'credit', name: 'Credit Card', icon: 'credit-card' },
  { id: 'wallet', name: 'Wallet', icon: 'wallet' },
];

const currencies = [
  { id: 'PHP', name: 'Philippine peso', symbol: '₱' },
  { id: 'USD', name: 'US Dollar', symbol: '$' },
  { id: 'EUR', name: 'Euro', symbol: '€' },
  { id: 'JPY', name: 'Japanese yen', symbol: '¥' },
  { id: 'GBP', name: 'British pound', symbol: '£' },
];

const accountIcons = [
  { icon: 'credit-card-outline', name: 'Card' },
  { icon: 'credit-card', name: 'Credit Card' },
  { icon: 'wallet', name: 'Wallet' },
  { icon: 'bank', name: 'Bank' },
  { icon: 'cash', name: 'Cash' },
  { icon: 'piggy-bank', name: 'Savings' },
  { icon: 'account-cash', name: 'Account' },
  { icon: 'currency-usd', name: 'Dollar' },
];

const colorOptions = [
  '#FF4B8C',
  '#4CAF50',
  '#FFD700',
  '#5C6BC0',
  '#666666',
  '#FF9800',
  '#009688',
  '#9C27B0',
];

export default function AccountForm({ account, onSave, onCancel }: AccountFormProps) {
  const insets = useSafeAreaInsets();
  const isEditing = !!account?.id;
  
  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState(account?.type || 'debit');
  const [icon, setIcon] = useState(account?.icon || 'credit-card');
  const [color, setColor] = useState(account?.color || '#FF4B8C');
  const [currencyId, setCurrencyId] = useState('PHP');
  const [currency, setCurrency] = useState('Philippine peso');
  const [balance, setBalance] = useState(account?.balance?.toString() || '0');
  const [creditLimit, setCreditLimit] = useState(account?.creditLimit?.toString() || '0');
  const [description, setDescription] = useState(account?.description || '');
  const [includeInTotal, setIncludeInTotal] = useState(account?.includeInTotal !== false);
  
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showIconModal, setShowIconModal] = useState(false);

  const selectedTypeInfo = accountTypes.find(t => t.id === type) || accountTypes[0];
  const selectedCurrency = currencies.find(c => c.id === currencyId) || currencies[0];

  const handleSave = () => {
    onSave({
      id: account?.id,
      name,
      type,
      icon,
      color,
      balance: parseFloat(balance),
      description,
      includeInTotal,
      creditLimit: type === 'credit' && creditLimit ? parseFloat(creditLimit) : undefined,
    });
  };

  const renderTypeModal = () => (
    <Modal
      visible={showTypeModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowTypeModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { paddingTop: insets.top > 0 ? insets.top : 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Account Type</Text>
            <TouchableOpacity onPress={() => setShowTypeModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalList}>
            {accountTypes.map(accountType => (
              <TouchableOpacity
                key={accountType.id}
                style={styles.modalItem}
                onPress={() => {
                  setType(accountType.id as 'debit' | 'credit' | 'wallet');
                  setIcon(accountType.icon);
                  setShowTypeModal(false);
                }}
              >
                <View style={styles.typeInfo}>
                  <MaterialCommunityIcons name={accountType.icon as any} size={24} color="#666" />
                  <Text style={styles.typeText}>{accountType.name}</Text>
                </View>
                {type === accountType.id && (
                  <MaterialCommunityIcons name="check" size={24} color="#6B8AFE" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderCurrencyModal = () => (
    <Modal
      visible={showCurrencyModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCurrencyModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { paddingTop: insets.top > 0 ? insets.top : 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalList}>
            {currencies.map(currency => (
              <TouchableOpacity
                key={currency.id}
                style={styles.modalItem}
                onPress={() => {
                  setCurrencyId(currency.id);
                  setCurrency(currency.name);
                  setShowCurrencyModal(false);
                }}
              >
                <Text style={styles.currencyText}>{currency.name} – {currency.symbol}</Text>
                {currencyId === currency.id && (
                  <MaterialCommunityIcons name="check" size={24} color="#6B8AFE" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderIconModal = () => (
    <Modal
      visible={showIconModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowIconModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { paddingTop: insets.top > 0 ? insets.top : 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Icon</Text>
            <TouchableOpacity onPress={() => setShowIconModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalList}>
            <Text style={styles.sectionTitle}>Icon</Text>
            <View style={styles.iconGrid}>
              {accountIcons.map(item => (
                <TouchableOpacity
                  key={item.icon}
                  style={[
                    styles.iconItem,
                    icon === item.icon && { borderColor: color }
                  ]}
                  onPress={() => setIcon(item.icon)}
                >
                  <MaterialCommunityIcons name={item.icon as any} size={32} color="#fff" />
                  <Text style={styles.iconText}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.sectionTitle}>Color</Text>
            <View style={styles.colorGrid}>
              {colorOptions.map(colorOption => (
                <TouchableOpacity
                  key={colorOption}
                  style={[
                    styles.colorItem,
                    { backgroundColor: colorOption },
                    color === colorOption && styles.colorItemSelected
                  ]}
                  onPress={() => setColor(colorOption)}
                />
              ))}
            </View>
            
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => setShowIconModal(false)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" />
      <View style={styles.statusBarSpace} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
          <MaterialCommunityIcons name="close" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit account' : 'New account'}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.doneButton}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.inputGroup}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Account name"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Account</Text>
            <TouchableOpacity 
              style={styles.typeSelector}
              onPress={() => setShowTypeModal(true)}
            >
              <View style={styles.typeInfo}>
                <MaterialCommunityIcons name={selectedTypeInfo.icon as any} size={24} color="#666" />
                <Text style={styles.typeText}>{selectedTypeInfo.name}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Icon & Color</Text>
            <TouchableOpacity 
              style={styles.typeSelector}
              onPress={() => setShowIconModal(true)}
            >
              <View style={styles.typeInfo}>
                <View style={[styles.iconPreview, { backgroundColor: color }]}>
                  <MaterialCommunityIcons name={icon as any} size={24} color="#fff" />
                </View>
                <Text style={styles.typeText}>Customize</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Account currency</Text>
            <TouchableOpacity 
              style={styles.currencySelector}
              onPress={() => setShowCurrencyModal(true)}
            >
              <Text style={styles.currencyText}>{selectedCurrency.name} – {selectedCurrency.symbol}</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional"
              placeholderTextColor="#999"
              multiline
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.groupHeader}>Balance</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Account balance</Text>
            <View style={styles.currencyInput}>
              <Text style={styles.currencySymbol}>{selectedCurrency.symbol}</Text>
              <TextInput
                style={styles.balanceInput}
                value={balance}
                onChangeText={setBalance}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {type === 'credit' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Credit limit</Text>
              <View style={styles.currencyInput}>
                <Text style={styles.currencySymbol}>{selectedCurrency.symbol}</Text>
                <TextInput
                  style={styles.balanceInput}
                  value={creditLimit}
                  onChangeText={setCreditLimit}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          )}

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Include in total balance</Text>
            <Switch
              value={includeInTotal}
              onValueChange={setIncludeInTotal}
              trackColor={{ false: '#444', true: '#6B8AFE' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </ScrollView>
      
      {renderTypeModal()}
      {renderCurrencyModal()}
      {renderIconModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  statusBarSpace: {
    height: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
  },
  doneButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#5672EF',
    borderRadius: 20,
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  inputGroup: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 24,
    overflow: 'hidden',
  },
  groupHeader: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    color: '#fff',
    padding: 0,
  },
  typeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencyText: {
    fontSize: 16,
    color: '#fff',
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 20,
    color: '#fff',
    marginRight: 8,
    opacity: 0.7,
  },
  balanceInput: {
    flex: 1,
    fontSize: 20,
    color: '#fff',
    padding: 0,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '100%',
    marginTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
  },
  modalList: {
    padding: 16,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
    marginTop: 16,
    marginBottom: 12,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  iconItem: {
    width: '23%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#2C2C2E',
    marginBottom: 12,
  },
  iconText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  colorItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 8,
  },
  colorItemSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  applyButton: {
    backgroundColor: '#6B8AFE',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  iconPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 