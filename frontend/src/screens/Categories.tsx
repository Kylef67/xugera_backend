import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateRangePicker, { DateRangeSelection } from '../components/DateRangePicker';

type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  transactions: number;
};

const initialCategories: Category[] = [
  {
    id: '1',
    name: 'Groceries',
    icon: 'cart',
    color: '#3D9BFC',
    amount: 0,
    transactions: 1,
  },
  {
    id: '2',
    name: 'Eating out',
    icon: 'silverware-fork-knife',
    color: '#505F92',
    amount: 10023,
    transactions: 0,
  },
  {
    id: '3',
    name: 'Leisure',
    icon: 'ticket',
    color: '#E6427B',
    amount: 0,
    transactions: 0,
  },
  {
    id: '4',
    name: 'Transport',
    icon: 'bus',
    color: '#C09046',
    amount: 33672,
    transactions: 0,
  },
  {
    id: '5',
    name: 'Health',
    icon: 'heart-pulse',
    color: '#3A8A47',
    amount: 0,
    transactions: 0,
  },
  {
    id: '6',
    name: 'Gifts',
    icon: 'gift',
    color: '#E74C3C',
    amount: 0,
    transactions: 0,
  },
  {
    id: '7',
    name: 'Family',
    icon: 'account-group',
    color: '#5D3F92',
    amount: 0,
    transactions: 0,
  },
  {
    id: '8',
    name: 'Shopping',
    icon: 'shopping',
    color: '#C1834B',
    amount: 0,
    transactions: 0,
  },
  {
    id: '9',
    name: 'Bills',
    icon: 'file-document',
    color: '#FF5B9E',
    amount: 0,
    transactions: 1,
  },
  {
    id: '10',
    name: 'Gas',
    icon: 'gas-station',
    color: '#F39C12',
    amount: 0,
    transactions: 0,
  },
  {
    id: '11',
    name: 'Transfer fees',
    icon: 'bank-transfer',
    color: '#3498DB',
    amount: 0,
    transactions: 0,
  },
  {
    id: '12',
    name: 'More...',
    icon: 'chevron-down',
    color: '#95A5A6',
    amount: 5001,
    transactions: 0,
  },
];

export default function Categories() {
  const [categories, setCategories] = useState(initialCategories);
  const [dateSelection, setDateSelection] = useState<DateRangeSelection>({
    mode: 'month',
    displayText: 'OCTOBER 2024',
    displayNumber: '31',
  });
  
  const totalExpenses = categories.reduce((sum, category) => sum + category.amount, 0);
  
  // Get categories with transactions this month
  const activeCategories = categories.filter(cat => cat.amount > 0 || cat.transactions > 0);
  
  // Format currency to ₱ X,XXX
  const formatCurrency = (amount: number) => {
    if (amount === 0) return '₱ 0';
    return `₱ ${amount.toLocaleString('en-PH')}`;
  };

  // Calculate the percentages for the donut chart
  const totalAmount = categories.reduce((sum, cat) => sum + cat.amount, 0);
  
  // Calculate the width of each category item based on screen width
  const screenWidth = Dimensions.get('window').width;
  const itemWidth = (screenWidth - 32) / 4; // 4 items per row with 16px padding on each side

  // Create a simple donut chart component
  const DonutChart = () => {
    return (
      <View style={styles.chartContainer}>
        {/* Pink donut (border creates the ring effect) */}
        <View style={styles.pinkDonut}>
          {/* Blue segment */}
          <View style={styles.blueSegment} />
        </View>
        
        {/* Center content */}
        <View style={styles.chartContent}>
          <Text style={styles.expensesTitle}>Expenses</Text>
          <Text style={styles.expensesAmount}>₱ 10,850</Text>
          <Text style={styles.expensesBalance}>₱ 0</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.profileButton}>
          <MaterialCommunityIcons name="account-circle-outline" size={28} color="#8E8E93" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>All accounts</Text>
          <Text style={styles.headerBalance}>₱ 213,827</Text>
        </View>
        
        <TouchableOpacity style={styles.addButton}>
          <MaterialCommunityIcons name="home-variant-outline" size={28} color="#8E8E93" />
        </TouchableOpacity>
      </View>
      
      {/* Date Range Picker */}
      <DateRangePicker
        selection={dateSelection}
        onSelectionChange={setDateSelection}
      />

      <View style={styles.content}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <View key={category.id} style={[styles.categoryItem, { width: itemWidth }]}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={[
                  styles.categoryAmount,
                  category.amount > 0 ? styles.hasAmount : null
                ]}>{formatCurrency(category.amount)}</Text>
                
                <View style={[styles.iconContainer, { backgroundColor: category.color }]}>
                  <MaterialCommunityIcons 
                    name={category.icon as any} 
                    size={24} 
                    color="#FFF" 
                  />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
        
      </View>
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
  content: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
    marginBottom: 230, // Make room for the donut chart at the bottom
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  categoryItem: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  categoryName: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  categoryAmount: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  hasAmount: {
    color: '#FFFFFF',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTransactions: {
    position: 'absolute',
    bottom: -4,
    color: '#3D9BFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  expensesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  chartContainer: {
    width: 230,
    height: 230,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pinkDonut: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 16,
    borderColor: '#E6427B',
    backgroundColor: '#1E1E1E',
  },
  blueSegment: {
    position: 'absolute',
    width: 42,
    height: 16,
    backgroundColor: '#3D9BFC',
    top: -16,
    right: 40,
    borderRadius: 8,
  },
  chartContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  expensesTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  expensesAmount: {
    color: '#E6427B',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  expensesBalance: {
    color: '#3D9BFC',
    fontSize: 16,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    backgroundColor: '#2C2C2E',
  },
  tabButton: {
    alignItems: 'center',
  },
  tabText: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 4,
  },
  activeTab: {
    backgroundColor: '#444',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  donutChartWrapper: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 