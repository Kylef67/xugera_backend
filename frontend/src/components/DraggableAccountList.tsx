import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, RefreshControl, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Account } from '../contexts/DataContext';
import DraggableFlatList, { 
  ScaleDecorator, 
  RenderItemParams,
  OpacityDecorator
} from 'react-native-draggable-flatlist';
import { useNavigation } from '@react-navigation/native';
import { formatCurrency } from '../utils/formatters';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface DraggableAccountListProps {
  accounts: Account[];
  onReorder: (accounts: Account[]) => void;
  onEditAccount?: (account: Account) => void;
  onDeleteAccount?: (account: Account) => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

export const DraggableAccountList: React.FC<DraggableAccountListProps> = ({ 
  accounts,
  onReorder,
  onEditAccount,
  onDeleteAccount,
  onRefresh,
  isRefreshing = false
}) => {
  const navigation = useNavigation<any>();
  const [isDragging, setIsDragging] = useState(false);
  const [sortedAccounts, setSortedAccounts] = useState<Account[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const flatListRef = useRef(null);
  
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

  const renderRightActions = (item: Account) => {
    if (!onDeleteAccount) return null;
    
    return (
      <Pressable 
        style={styles.deleteAction}
        onPress={() => {
          console.log('Swipe delete button pressed for account:', item.name);
          onDeleteAccount(item);
        }}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={24} color="white" />
        <Text style={styles.deleteActionText}>Delete</Text>
      </Pressable>
    );
  };
  
  const renderAccountItem = (item: Account, index: number) => {
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
    
    // Determine account type badge
    let badgeColor;
    switch (item.type) {
      case 'debit':
        badgeColor = '#4CAF50';
        break;
      case 'credit':
        badgeColor = '#FF4B8C';
        break;
      case 'wallet':
        badgeColor = '#FFD700';
        break;
      default:
        badgeColor = '#8E8E93';
    }
    
    return (
      <View key={item.id} style={styles.accountItemWrapper}>
        {Platform.OS === 'web' ? (
          // Web version - simpler implementation without swipeable
          <Pressable
            testID="account-item-pressable"
            onPress={handlePress}
            style={({ pressed }) => [
              styles.accountItem,
              pressed && styles.pressedItem
            ]}
          >
            <View style={styles.accountContent}>
              <View style={[styles.iconContainer, { backgroundColor: item.color || '#007AFF' }]}>
                <MaterialCommunityIcons name={iconName as any} size={24} color="white" />
              </View>
              <View style={styles.accountDetails}>
                <View style={styles.accountNameRow}>
                  <Text style={styles.accountName}>{item.name}</Text>
                  <View style={[styles.typeBadge, { backgroundColor: badgeColor }]}>
                    <Text style={styles.typeBadgeText}>
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Text>
                  </View>
                </View>
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
              {onDeleteAccount && (
                <Pressable 
                  testID={`delete-account-${item.id}`}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    console.log('Delete button clicked for account:', item.name);
                    onDeleteAccount(item);
                  }}
                  style={styles.webDeleteButton}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color="#8E8E93" />
                </Pressable>
              )}
            </View>
          </Pressable>
        ) : (
          // Mobile version - with swipeable and drag functionality
          <ScaleDecorator>
            <OpacityDecorator activeOpacity={0.7}>
              <GestureHandlerRootView>
                <Swipeable
                  renderRightActions={() => renderRightActions(item)}
                  enabled={!isDragging && !!onDeleteAccount}
                >
                  <Pressable
                    testID="account-item-pressable"
                    onPress={handlePress}
                    onLongPress={() => {
                      setIsDragging(true);
                      // This is handled by DraggableFlatList
                    }}
                    style={({ pressed }) => [
                      styles.accountItem,
                      pressed && styles.pressedItem
                    ]}
                  >
                    <View style={styles.accountContent}>
                      <View style={[styles.iconContainer, { backgroundColor: item.color || '#007AFF' }]}>
                        <MaterialCommunityIcons name={iconName as any} size={24} color="white" />
                      </View>
                      <View style={styles.accountDetails}>
                        <View style={styles.accountNameRow}>
                          <Text style={styles.accountName}>{item.name}</Text>
                          <View style={[styles.typeBadge, { backgroundColor: badgeColor }]}>
                            <Text style={styles.typeBadgeText}>
                              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                            </Text>
                          </View>
                        </View>
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
                </Swipeable>
              </GestureHandlerRootView>
            </OpacityDecorator>
          </ScaleDecorator>
        )}
      </View>
    );
  };
  
  // For mobile platforms, use DraggableFlatList
  const renderMobileList = () => {
    const renderItem = ({ item, drag, isActive }: RenderItemParams<Account>) => {
      const handlePress = () => {
        if (!isDragging && onEditAccount) {
          onEditAccount(item);
        } else if (!isDragging) {
          navigation.navigate('AccountForm', { account: item });
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
      
      // Determine account type badge
      let badgeColor;
      switch (item.type) {
        case 'debit':
          badgeColor = '#4CAF50';
          break;
        case 'credit':
          badgeColor = '#FF4B8C';
          break;
        case 'wallet':
          badgeColor = '#FFD700';
          break;
        default:
          badgeColor = '#8E8E93';
      }
      
      return (
        <ScaleDecorator>
          <OpacityDecorator activeOpacity={0.7}>
            <GestureHandlerRootView>
              <Swipeable
                renderRightActions={() => renderRightActions(item)}
                enabled={!isDragging && !!onDeleteAccount}
              >
                <Pressable
                  testID="account-item-pressable"
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
                      <View style={styles.accountNameRow}>
                        <Text style={styles.accountName}>{item.name}</Text>
                        <View style={[styles.typeBadge, { backgroundColor: badgeColor }]}>
                          <Text style={styles.typeBadgeText}>
                            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                          </Text>
                        </View>
                      </View>
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
              </Swipeable>
            </GestureHandlerRootView>
          </OpacityDecorator>
        </ScaleDecorator>
      );
    };
    
    return (
      <DraggableFlatList
        ref={flatListRef}
        data={sortedAccounts}
        renderItem={renderItem}
        keyExtractor={(item: Account) => item.id}
        onDragEnd={handleDragEnd}
        contentContainerStyle={styles.listContent}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#6B8AFE"
              colors={["#6B8AFE"]}
            />
          ) : undefined
        }
      />
    );
  };
  
  // For web platform, use ScrollView with manual rendering
  const renderWebList = () => {
    return (
      <ScrollView
        ref={scrollViewRef}
        style={styles.webScrollView}
        contentContainerStyle={styles.webListContent}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#6B8AFE"
              colors={["#6B8AFE"]}
            />
          ) : undefined
        }
      >
        {sortedAccounts.map((item, index) => renderAccountItem(item, index))}
      </ScrollView>
    );
  };
  
  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? renderWebList() : renderMobileList()}
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
  webScrollView: {
    width: '100%',
    flex: 1,
  },
  webListContent: {
    paddingBottom: 20,
  },
  accountItemWrapper: {
    width: '100%',
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
    justifyContent: 'center',
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
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
    alignSelf: 'center',
  },
  deleteAction: {
    backgroundColor: '#FF4B8C',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    marginTop: 10,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  deleteActionText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  webDeleteButton: {
    padding: 10,
    marginLeft: 8,
  },
});

export default DraggableAccountList; 