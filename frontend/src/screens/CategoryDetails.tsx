import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useData, Category } from '../contexts/DataContext';
import CategoryForm from './CategoryForm';
import { formatCurrency } from '../utils/formatters';

interface CategoryDetailsProps {
  category: Category;
  onBack: () => void;
  onEdit?: () => void;
}

export default function CategoryDetails({ category, onBack, onEdit }: CategoryDetailsProps) {
  const { getSubcategories, getCategoryTransactions, updateCategory, deleteCategory } = useData();
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [transactionData, setTransactionData] = useState<any>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const screenWidth = Dimensions.get('window').width;
  const itemWidth = (screenWidth - 48) / 3; // 3 items per row with padding

  useEffect(() => {
    loadCategoryData();
  }, [category.id]);

  const loadCategoryData = async () => {
    setLoading(true);
    try {
      // Load subcategories and transaction data in parallel
      const [subcategoriesData, transactionsData] = await Promise.all([
        getSubcategories(category.id),
        getCategoryTransactions(category.id)
      ]);

      setSubcategories(subcategoriesData);
      setTransactionData(transactionsData);
    } catch (error) {
      console.error('Failed to load category data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubcategoryPress = (subcategory: Category) => {
    // Handle subcategory navigation - could open another CategoryDetails
    console.log('Subcategory pressed:', subcategory.name);
  };

  const handleEditCategory = () => {
    setShowEditForm(true);
  };

  const handleSaveCategory = async (categoryData: any) => {
    try {
      await updateCategory({
        ...category,
        ...categoryData,
      });
      setShowEditForm(false);
      loadCategoryData(); // Refresh data
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteCategory = async () => {
    try {
      await deleteCategory(category.id);
      onBack(); // Go back to categories list
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  if (showEditForm) {
    return (
      <CategoryForm 
        category={{
          id: category.id,
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
        }}
        onSave={handleSaveCategory}
        onCancel={() => setShowEditForm(false)}
      />
    );
  }

  const totalSpent = category.transactions?.all.total || 0;
  const transactionCount = category.transactions?.all.count || 0;
  const directSpent = category.transactions?.direct.total || 0;
  const subcategorySpent = category.transactions?.subcategories.total || 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{category.name}</Text>
          <Text style={styles.headerSubtitle}>{category.type} Category</Text>
        </View>
        
        <TouchableOpacity onPress={handleEditCategory} style={styles.editButton}>
          <MaterialCommunityIcons name="pencil" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Category Icon & Summary */}
        <View style={styles.summaryCard}>
          <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
            <MaterialCommunityIcons 
              name={category.icon as any} 
              size={48} 
              color="#FFFFFF" 
            />
          </View>
          
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryTitle}>{category.name}</Text>
            {category.description && (
              <Text style={styles.summaryDescription}>{category.description}</Text>
            )}
            
            <View style={styles.spendingInfo}>
              <Text style={styles.totalSpent}>{formatCurrency(Math.abs(totalSpent))}</Text>
              <Text style={styles.transactionCount}>
                {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Spending Breakdown */}
        {(directSpent !== 0 || subcategorySpent !== 0) && (
          <View style={styles.breakdownCard}>
            <Text style={styles.sectionTitle}>Spending Breakdown</Text>
            
            {directSpent !== 0 && (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Direct Spending</Text>
                <Text style={styles.breakdownAmount}>{formatCurrency(Math.abs(directSpent))}</Text>
              </View>
            )}
            
            {subcategorySpent !== 0 && (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Subcategory Spending</Text>
                <Text style={styles.breakdownAmount}>{formatCurrency(Math.abs(subcategorySpent))}</Text>
              </View>
            )}
            
            <View style={[styles.breakdownItem, styles.totalBreakdown]}>
              <Text style={styles.breakdownLabelTotal}>Total</Text>
              <Text style={styles.breakdownAmountTotal}>{formatCurrency(Math.abs(totalSpent))}</Text>
            </View>
          </View>
        )}

        {/* Subcategories */}
        {subcategories.length > 0 && (
          <View style={styles.subcategoriesCard}>
            <Text style={styles.sectionTitle}>Subcategories ({subcategories.length})</Text>
            
            <View style={styles.subcategoriesGrid}>
              {subcategories.map((subcategory) => (
                <TouchableOpacity 
                  key={subcategory.id} 
                  style={[styles.subcategoryItem, { width: itemWidth }]}
                  onPress={() => handleSubcategoryPress(subcategory)}
                >
                  <View style={[styles.subcategoryIcon, { backgroundColor: subcategory.color }]}>
                    <MaterialCommunityIcons 
                      name={subcategory.icon as any} 
                      size={24} 
                      color="#FFFFFF" 
                    />
                  </View>
                  
                  <Text style={styles.subcategoryName} numberOfLines={1}>
                    {subcategory.name}
                  </Text>
                  
                  <Text style={styles.subcategoryAmount}>
                    {formatCurrency(Math.abs(subcategory.amount || 0))}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleEditCategory}>
            <MaterialCommunityIcons name="pencil" size={24} color="#6B8AFE" />
            <Text style={styles.actionButtonText}>Edit Category</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons name="plus" size={24} color="#6B8AFE" />
            <Text style={styles.actionButtonText}>Add Subcategory</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons name="chart-bar" size={24} color="#6B8AFE" />
            <Text style={styles.actionButtonText}>View Transactions</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#8E8E93" />
          </TouchableOpacity>
          
          {subcategories.length === 0 && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]} 
              onPress={handleDeleteCategory}
            >
              <MaterialCommunityIcons name="delete" size={24} color="#FF4B8C" />
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete Category</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>

        {/* Empty State */}
        {totalSpent === 0 && subcategories.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="chart-pie" size={64} color="#8E8E93" />
            <Text style={styles.emptyStateTitle}>No Activity Yet</Text>
            <Text style={styles.emptyStateDescription}>
              This category hasn't been used in any transactions yet.
            </Text>
          </View>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  editButton: {
    padding: 8,
    marginRight: -8,
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  categoryIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  summaryDescription: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 12,
  },
  spendingInfo: {
    alignItems: 'flex-start',
  },
  totalSpent: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FF4B8C',
    marginBottom: 4,
  },
  transactionCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  breakdownCard: {
    backgroundColor: '#2C2C2E',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  breakdownAmount: {
    fontSize: 16,
    color: '#8E8E93',
  },
  totalBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#444',
    marginTop: 8,
    paddingTop: 12,
  },
  breakdownLabelTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  breakdownAmountTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4B8C',
  },
  subcategoriesCard: {
    backgroundColor: '#2C2C2E',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  subcategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  subcategoryItem: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 8,
  },
  subcategoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  subcategoryName: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  subcategoryAmount: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  actionsCard: {
    backgroundColor: '#2C2C2E',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  deleteButton: {
    borderBottomWidth: 0,
  },
  deleteButtonText: {
    color: '#FF4B8C',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
}); 