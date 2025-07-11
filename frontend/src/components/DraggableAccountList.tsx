import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Account } from '../contexts/DataContext';
import DraggableFlatList, { 
  ScaleDecorator, 
  RenderItemParams,
  OpacityDecorator
} from 'react-native-draggable-flatlist';
import { useNavigation } from '@react-navigation/native';
import { formatCurrency } from '../utils/formatters';

interface DraggableAccountListProps {
  accounts: Account[];
  onReorder: (accounts: Account[]) => void;
  onEditAccount?: (account: Account) => void;
}

export const DraggableAccountList: React.FC<DraggableAccountListProps> = ({ 
  accounts,
  onReorder,
  onEditAccount
}) => {
  const navigation = useNavigation<any>();
  const [isDragging, setIsDragging] = useState(false);
  const [sortedAccounts, setSortedAccounts] = useState<Account[]>([]);
  
  // Sort accounts by order when component mounts or accounts change
  useEffect(() => {
    // Create a copy of accounts to avoid mutating props
    const accountsToSort = [...accounts];
    
    // Sort by order if available, fall back to updatedAt
    const sorted = accountsToSort.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // If only one has order, prioritize the one with order
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      // Default sort (no order defined)
      return 0;
    });
    
    setSortedAccounts(sorted);
  }, [accounts]);
  
  const handleDragEnd = ({ data }: { data: Account[] }) => {
    setIsDragging(false);
    
    // Update the order field for each account based on its new position
    const updatedAccounts = data.map((account, index) => ({
      ...account,
      order: index
    }));
    
    onReorder(updatedAccounts);
  };
  
  const renderItem = ({ item, drag, isActive }: RenderItemParams<Account>) => {
    const handlePress = () => {
      if (!isDragging) {
        // Use the onEditAccount callback if provided, otherwise try to navigate
        if (onEditAccount) {
          onEditAccount(item);
        } else {
          // Fallback to navigation if onEditAccount is not provided
          navigation.navigate('AccountForm', { account: item });
        }
      }
    };
    
    // Determine icon
    let iconName = item.icon || 'credit-card';
    
    // Format balance
    const formattedBalance = formatCurrency(item.balance);
    
    // For credit accounts, show available credit
    let creditInfo = null;
    if (item.type === 'credit' && item.creditLimit) {
      const availableCredit = item.creditLimit + item.balance;
      creditInfo = (
        <Text style={styles.creditInfo}>₱ {availableCredit.toLocaleString()}</Text>
      );
    }
    
    return (
      <ScaleDecorator>
        <OpacityDecorator activeOpacity={0.7}>
          <Pressable
            onPress={handlePress}
            onLongPress={() => {
              setIsDragging(true);
              drag();
            }}
            style={({ pressed }) => [
              styles.accountItem,
              isActive && styles.activeItem,
              pressed && styles.pressedItem
            ]}
          >
            <View style={styles.accountContent}>
              <View style={[styles.iconContainer, { backgroundColor: item.color || '#007AFF' }]}>
                <MaterialCommunityIcons name={iconName as any} size={24} color="white" />
              </View>
              <View style={styles.accountDetails}>
                <Text style={styles.accountName}>{item.name}</Text>
                <View style={styles.balanceContainer}>
                  <Text 
                    style={[
                      styles.accountBalance, 
                      item.balance < 0 && styles.negativeBalance
                    ]}
                  >
                    {formattedBalance}
                  </Text>
                  {creditInfo}
                </View>
              </View>
              <MaterialCommunityIcons 
                name="drag" 
                size={24} 
                color="#8E8E93" 
                style={styles.dragHandle}
              />
            </View>
          </Pressable>
        </OpacityDecorator>
      </ScaleDecorator>
    );
  };
  
  return (
    <View style={styles.container}>
      <DraggableFlatList
        data={sortedAccounts}
        renderItem={renderItem}
        keyExtractor={(item: Account) => item.id}
        onDragEnd={handleDragEnd}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    paddingBottom: 20,
  },
  accountItem: {
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  activeItem: {
    backgroundColor: '#3A3A3C',
    transform: [{ scale: 1.02 }],
    zIndex: 999,
  },
  pressedItem: {
    opacity: 0.8,
  },
  accountContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountDetails: {
    flex: 1,
    marginLeft: 12,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountBalance: {
    fontSize: 14,
    color: '#4CAF50',
  },
  negativeBalance: {
    color: '#FF4B8C',
  },
  creditInfo: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 8,
  },
  dragHandle: {
    padding: 8,
  },
});

export default DraggableAccountList; 