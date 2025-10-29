import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type NetworkStateListener = (isConnected: boolean) => void;

class NetworkManager {
  private listeners: NetworkStateListener[] = [];
  private isConnected: boolean = true;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Subscribe to network state updates
    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasConnected = this.isConnected;
      this.isConnected = state.isConnected ?? false;
      
      console.log(`🌐 Network state changed: ${wasConnected ? 'Online' : 'Offline'} → ${this.isConnected ? 'Online' : 'Offline'}`);
      
      // Notify all listeners if state changed
      if (wasConnected !== this.isConnected) {
        this.notifyListeners(this.isConnected);
      }
    });

    // Get initial network state
    NetInfo.fetch().then((state: NetInfoState) => {
      this.isConnected = state.isConnected ?? false;
      console.log(`🌐 Initial network state: ${this.isConnected ? 'Online' : 'Offline'}`);
    });
  }

  /**
   * Get current network connection status
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Fetch current network state (async)
   */
  async fetchNetworkState(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isConnected = state.isConnected ?? false;
    return this.isConnected;
  }

  /**
   * Add a listener for network state changes
   * @param listener - Callback function that receives the new connection state
   * @returns Unsubscribe function
   */
  addListener(listener: NetworkStateListener): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of network state change
   */
  private notifyListeners(isConnected: boolean) {
    this.listeners.forEach(listener => {
      try {
        listener(isConnected);
      } catch (error) {
        console.error('Error in network state listener:', error);
      }
    });
  }

  /**
   * Clean up network manager (call when app unmounts)
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners = [];
  }
}

// Export singleton instance
export const networkManager = new NetworkManager();
export default networkManager;
