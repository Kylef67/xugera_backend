# Offline-First Implementation

This implementation provides a robust offline-first architecture for the Xugera app, allowing users to work seamlessly whether they're online or offline.

## Features

✅ **Offline Storage**: All data is stored locally using Expo SQLite, ensuring the app works without an internet connection.

✅ **Automatic Sync**: When online, the app automatically syncs local changes with the server.

✅ **Multi-device Support**: Changes made on one device are synced to other devices when connected.

✅ **Conflict Resolution**: When data is edited on multiple devices, the newer timestamp wins.

✅ **Incremental Sync**: Only changed documents are sent/received, not full database dumps.

✅ **Network Status Indicator**: Real-time display of online/offline status.

✅ **Manual Sync**: Users can manually trigger sync operations.

## How it Works

### 1. Local Storage
- Uses Expo SQLite for local data persistence
- Data is stored with timestamps for conflict resolution
- Soft deletes to track deletions across devices

### 2. Sync Process
- **Pull**: Fetches changes from server since last sync
- **Push**: Sends local changes to server
- **Conflict Resolution**: Newer changes overwrite older ones

### 3. Network Management
- Automatic network status detection
- Auto-sync when connection is restored
- Graceful degradation when offline

## Usage

### Dashboard Features
- **Online/Offline Indicator**: Shows current connection status
- **Sync Button**: Manually trigger sync when online
- **Sync Status**: Shows sync progress and results

### Account Management
- **Add Account**: Works offline, syncs when online
- **Edit Account**: Local changes are queued for sync
- **Delete Account**: Soft deletion that syncs across devices

## Technical Implementation

### Database Service (`src/services/database.ts`)
- Manages local SQLite database
- Provides CRUD operations with timestamps
- Handles sync metadata

### Sync Service (`src/services/syncService.ts`)
- Manages sync operations with backend
- Handles conflict resolution
- Provides network status monitoring
- Uses AsyncStorage for sync settings (compatible with Expo)

### Backend Sync Endpoints
- `POST /account/sync/pull`: Get changes since timestamp
- `POST /account/sync/push`: Send local changes to server

## Configuration

### Auto-Sync Settings
- **Enabled by default**: Sync happens automatically when online
- **Interval**: 30 seconds by default
- **Customizable**: Can be changed via sync service

### Network Detection
- Uses `@react-native-community/netinfo` for accurate network status
- Checks both connectivity and internet reachability

## Testing Offline Functionality

1. **Disable Network**: Turn off WiFi/cellular on your device
2. **Make Changes**: Add/edit/delete accounts
3. **Enable Network**: Turn network back on
4. **Observe Sync**: Changes should automatically sync

## Dependencies

```json
{
  "expo-sqlite": "^15.2.14",
  "@react-native-async-storage/async-storage": "^2.2.0",
  "@react-native-community/netinfo": "^11.4.1",
  "uuid": "^11.1.0"
}
```

## Troubleshooting

### Common Issues

1. **Sync Not Working**: Check network connection and backend server status
2. **Data Loss**: Conflicts are resolved by timestamp - newer changes win
3. **Performance**: Large datasets may slow down sync - consider pagination
4. **MMKV Errors**: We use AsyncStorage instead of MMKV for better Expo compatibility

### Debug Mode
- Check console logs for sync status and errors
- Monitor network requests in React Native Debugger
- Use sync result notifications in the UI

## Future Enhancements

- [ ] Real-time sync using WebSockets
- [ ] Batch operations for better performance
- [ ] User authentication and data isolation
- [ ] Advanced conflict resolution strategies
- [ ] Background sync using background tasks
- [ ] Compression for large data transfers

## Security Considerations

- All data is stored locally without encryption (add encryption for production)
- No authentication currently implemented
- Network requests should use HTTPS in production
- Consider implementing row-level security for multi-user scenarios 