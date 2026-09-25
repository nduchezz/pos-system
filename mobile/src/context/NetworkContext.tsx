import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkContextType {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  refresh: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  isChecking: true,
  lastChecked: null,
  refresh: async () => {},
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);
      setLastChecked(new Date());
      setIsChecking(false);
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);
      setLastChecked(new Date());
      setIsChecking(false);
    });

    return unsubscribe;
  }, []);

  const refresh = async () => {
    setIsChecking(true);
    const state = await NetInfo.fetch();
    const online = !!state.isConnected && state.isInternetReachable !== false;
    setIsOnline(online);
    setLastChecked(new Date());
    setIsChecking(false);
  };

  return (
    <NetworkContext.Provider value={{ isOnline, isChecking, lastChecked, refresh }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
