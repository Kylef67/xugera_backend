import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../contexts/DataContext';

export function SyncStatusIndicator() {
  const { isOnline, isSyncing, offlineQueueCount, lastSyncTime } = useData();

  const getStatusColor = () => {
    if (isSyncing) return '#FFA500'; // Orange
    if (!isOnline) return '#FF4444'; // Red
    return '#4CAF50'; // Green
  };

  const getStatusIcon = () => {
    if (isSyncing) return 'sync';
    if (!isOnline) return 'cloud-off-outline';
    return 'cloud-check-outline';
  };

  const getStatusText = () => {
    if (isSyncing) return 'Syncing...';
    if (!isOnline && offlineQueueCount > 0) {
      return `Offline (${offlineQueueCount} pending)`;
    }
    if (!isOnline) return 'Offline';
    if (lastSyncTime > 0) {
      const minutesAgo = Math.floor((Date.now() - lastSyncTime) / 60000);
      if (minutesAgo < 1) return 'Synced just now';
      if (minutesAgo < 60) return `Synced ${minutesAgo}m ago`;
      const hoursAgo = Math.floor(minutesAgo / 60);
      return `Synced ${hoursAgo}h ago`;
    }
    return 'Online';
  };

  const statusColor = getStatusColor();
  const statusIcon = getStatusIcon();
  const statusText = getStatusText();

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: statusColor }]} />
      {isSyncing ? (
        <ActivityIndicator size="small" color={statusColor} style={styles.icon} />
      ) : (
        <MaterialCommunityIcons name={statusIcon as any} size={16} color={statusColor} style={styles.icon} />
      )}
      <Text style={[styles.text, { color: statusColor }]}>{statusText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default SyncStatusIndicator;
