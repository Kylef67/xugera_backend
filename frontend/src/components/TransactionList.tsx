import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, Alert } from 'react-native';
import withObservables from '@nozbe/with-observables';
import { Model } from '@nozbe/watermelondb';
import { database, collections } from '../database';
import { syncService } from '../services/syncService';

interface TransactionListProps {
  transactions: Model[];
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions }) => {
  const [isConnected, setIsConnected] = useState(syncService.getConnectionStatus());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Monitor connection status
    const interval = setInterval(() => {
      setIsConnected(syncService.getConnectionStatus());
      setIsSyncing(syncService.isSyncing());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleAddTransaction = async () => {
    try {
      await database.write(async () => {
        await collections.transactions.create((transaction: any) => {
          transaction._raw.transaction_date = Date.now();
          transaction._raw.from_account = 'demo_account_1';
          transaction._raw.amount = Math.floor(Math.random() * 1000);
        });
      });
      Alert.alert('Success', 'Transaction added locally!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add transaction');
      console.error(error);
    }
  };

  const handleSync = async () => {
    try {
      await syncService.forceSyncNow();
      Alert.alert('Success', 'Sync completed!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Sync failed: ${errorMessage}`);
    }
  };

  const renderTransaction = ({ item }: { item: any }) => (
    <View style={{ 
      padding: 10, 
      borderBottomWidth: 1, 
      borderBottomColor: '#eee',
      backgroundColor: '#f9f9f9',
      marginVertical: 2
    }}>
      <Text style={{ fontWeight: 'bold' }}>Amount: ${item._raw.amount || 0}</Text>
      <Text>Date: {item._raw.transaction_date ? new Date(item._raw.transaction_date).toLocaleDateString() : 'No date'}</Text>
      <Text>From: {item._raw.from_account || 'Unknown'}</Text>
      {item._raw.to_account && <Text>To: {item._raw.to_account}</Text>}
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          WatermelonDB Demo
        </Text>
        <Text>Status: {isConnected ? '🟢 Online' : '🔴 Offline'}</Text>
        <Text>Syncing: {isSyncing ? '⏳ Yes' : '✅ No'}</Text>
        <Text>Transactions: {transactions.length}</Text>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <Button 
          title="Add Transaction" 
          onPress={handleAddTransaction}
          color="#007AFF"
        />
        <View style={{ width: 10 }} />
        <Button 
          title="Sync Now" 
          onPress={handleSync}
          disabled={!isConnected || isSyncing}
          color="#34C759"
        />
      </View>

      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
        Local Transactions:
      </Text>
      
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>
            No transactions yet. Add some!
          </Text>
        }
      />
    </View>
  );
};

// Observe the transactions collection
const enhance = withObservables([], () => ({
  transactions: collections.transactions.query().observe()
}));

export default enhance(TransactionList); 