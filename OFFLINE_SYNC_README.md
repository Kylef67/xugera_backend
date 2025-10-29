# Offline-First Sync Implementation

## Overview

This implementation adds full offline support to the Xugera Personal Finance App with multi-user synchronization capabilities. The app now works seamlessly offline and automatically syncs changes when connectivity is restored.

## Architecture

### Key Components

1. **Backend Sync Infrastructure**
   - `backend/src/controllers/sync.ts` - Sync endpoints for push/pull operations
   - `backend/src/routes/sync.ts` - Sync API routes
   - Enhanced models with `syncVersion` and `lastModifiedBy` fields

2. **Frontend Services**
   - `frontend/src/services/storageService.ts` - Local data persistence using AsyncStorage
   - `frontend/src/services/networkManager.ts` - Network state detection
   - `frontend/src/services/syncService.ts` - Sync logic and conflict resolution

3. **Frontend Context**
   - Enhanced `DataContext.tsx` with offline queue management
   - Automatic sync triggers on network reconnection
   - Periodic background sync (every 30 seconds when online)

4. **UI Components**
   - `SyncStatusIndicator.tsx` - Displays online/offline status and queue count

## Features Implemented

### ✅ Offline Data Persistence
- All data (accounts, categories, transactions) stored locally using AsyncStorage
- Works on iOS, Android, and Web (via Expo)
- Immediate UI feedback with optimistic updates

### ✅ Offline Queue Management
- Create, update, and delete operations queued when offline
- Queue persists across app restarts
- Automatic processing when connection restored

### ✅ Network Detection
- Real-time online/offline status monitoring
- Automatic sync trigger on connection restoration
- Visual indicator in UI

### ✅ Incremental Sync
- Efficient timestamp-based sync (only fetches changes since last sync)
- Reduces data transfer and improves performance
- Supports multi-device scenarios

### ✅ Conflict Resolution (Server-Wins)
- Server timestamp always takes precedence
- Offline changes rejected if server has newer data
- Example: Mama offline deletes account, Papa online adds transaction → Account remains (Papa wins)

### ✅ Multi-User Support
- Changes propagate across devices within 30 seconds
- Background polling for changes from other users
- Handles concurrent edits gracefully

## API Endpoints

### GET /api/sync/changes
Fetch incremental changes since last sync.

**Query Parameters:**
- `lastSyncTimestamp` (number, required) - Unix timestamp of last successful sync
- `deviceId` (string, required) - Unique device identifier

**Response:**
```json
{
  "accounts": [...],
  "categories": [...],
  "transactions": [...],
  "currentTimestamp": 1698765432000,
  "syncedAt": "2025-10-29T02:30:32.000Z"
}
```

### POST /api/sync/push
Push offline queue to server.

**Request Body:**
```json
{
  "operations": [
    {
      "id": "op-123",
      "operationId": "op-123",
      "type": "CREATE|UPDATE|DELETE",
      "resource": "account|category|transaction",
      "data": {...},
      "localTimestamp": 1698765400000,
      "deviceId": "device-abc"
    }
  ],
  "deviceId": "device-abc"
}
```

**Response:**
```json
{
  "success": true,
  "accepted": [{"operationId": "op-123", "id": "507f1f77bcf86cd799439011"}],
  "conflicts": [],
  "rejected": [],
  "serverData": {
    "accounts": [...],
    "categories": [...],
    "transactions": [...]
  },
  "currentTimestamp": 1698765432000
}
```

### GET /api/sync/status
Get server status and data counts.

**Response:**
```json
{
  "status": "online",
  "serverTime": 1698765432000,
  "counts": {
    "accounts": 5,
    "categories": 12,
    "transactions": 143
  }
}
```

## Database Schema Changes

All models now include:
- `syncVersion` (Number, default: 1) - Incremented on each mutation
- `lastModifiedBy` (String, default: 'system') - Device ID that made the change
- `updatedAt` (Number) - Unix timestamp of last update

## Usage

### Frontend Context

```typescript
import { useData } from './contexts/DataContext';

function MyComponent() {
  const {
    accounts,
    isOnline,
    isSyncing,
    offlineQueueCount,
    lastSyncTime,
    addAccount,
    triggerSync
  } = useData();

  // All mutations work offline automatically
  const handleAddAccount = async () => {
    await addAccount({
      name: 'New Account',
      balance: 1000,
      type: 'debit'
    });
    // Optimistic update applied immediately
    // Queued if offline, synced when online
  };

  return (
    <View>
      <Text>Online: {isOnline ? 'Yes' : 'No'}</Text>
      <Text>Pending: {offlineQueueCount}</Text>
      <Button title="Manual Sync" onPress={triggerSync} />
    </View>
  );
}
```

### Storage Service

```typescript
import storageService from './services/storageService';

// Save data
await storageService.saveAccounts(accounts);

// Load data
const accounts = await storageService.getAccounts();

// Device ID
const deviceId = await storageService.getDeviceId();
```

### Network Manager

```typescript
import networkManager from './services/networkManager';

// Check current status
const isOnline = networkManager.getIsConnected();

// Listen for changes
const unsubscribe = networkManager.addListener((isConnected) => {
  console.log('Network:', isConnected ? 'Online' : 'Offline');
});
```

## Testing

### Run Backend Tests
```bash
cd backend
npm test
```

### Run E2E Tests
```bash
# Start frontend
cd frontend
npm run web

# Run tests (in separate terminal)
cd ..
npm run test
```

### Offline Sync Tests
The `tests/offline-sync.spec.ts` file includes:
1. Sync status indicator display
2. Create account while online
3. Create account while offline (queue and sync)
4. Multi-user sync simulation
5. Conflict resolution (server-wins)
6. Offline queue persistence

## Deployment

### Backend
```bash
cd backend
npm run deploy-test  # Deploy to test environment
npm run deploy-prod  # Deploy to production
```

### Frontend
```bash
cd frontend
npm run web    # Web development
npm run android # Android development
npm run ios    # iOS development
```

## Conflict Resolution Examples

### Example 1: Offline Delete vs Online Transaction
1. **Mama** (offline): Deletes Account A at 10:00 AM
2. **Papa** (online): Adds transaction to Account A at 10:01 AM
3. **Result**: When Mama comes online, her delete operation is rejected (conflict)
4. **Outcome**: Account A remains with Papa's transaction (Server wins)

### Example 2: Concurrent Updates
1. **Device A**: Updates account balance to $100 at 10:00:00
2. **Device B**: Updates same account balance to $200 at 10:00:05
3. **Result**: Device B's update takes precedence (newer timestamp)
4. **Outcome**: Final balance is $200

### Example 3: Offline Queue Processing
1. **User** goes offline, makes 5 changes
2. Changes queued locally and persisted
3. **User** comes online
4. All 5 operations sent to server in batch
5. Server processes each, returns conflicts/acceptances
6. UI updates with final server state

## Performance Considerations

- **Local Storage**: AsyncStorage is async and persistent
- **Incremental Sync**: Only syncs changes since last timestamp
- **Background Sync**: Runs every 30 seconds when online (configurable)
- **Conflict Handling**: Minimal - server simply returns newer data
- **Queue Limits**: No hard limit, but consider memory constraints for very large queues

## Known Limitations

1. **Large Datasets**: Initial sync may be slow for users with thousands of transactions
2. **WebSocket**: Not implemented - uses polling instead (future enhancement)
3. **Merge Strategies**: Only server-wins implemented (could add custom merge logic)
4. **Queue Size**: No maximum queue size enforced
5. **Retry Logic**: Basic retry, no exponential backoff yet

## Future Enhancements

1. **WebSocket Support**: Real-time sync instead of polling
2. **Partial Updates**: Only sync changed fields, not entire records
3. **Compression**: Compress sync payloads for large datasets
4. **Smart Merge**: Allow user to choose which version to keep in conflicts
5. **Sync History**: Track sync operations for debugging
6. **Background Sync**: Use native background tasks on mobile

## Troubleshooting

### Sync Not Working
1. Check network connectivity
2. Verify backend is running and accessible
3. Check browser console for errors
4. Verify `MONGO_URI` environment variable is set

### Queue Not Persisting
1. Check AsyncStorage permissions
2. Verify storage quota not exceeded
3. Check for storage errors in console

### Conflicts Not Resolving
1. Verify server timestamps are correct
2. Check conflict resolution logic in sync service
3. Review server logs for errors

## Contributing

When adding new features that involve data mutations:
1. Update backend controller to increment `syncVersion`
2. Add `deviceId` parameter support
3. Update frontend method to queue operation if offline
4. Add tests for online/offline scenarios

## License

MIT
