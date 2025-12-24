import type { ParentComponent } from 'solid-js';
import { createContext, useContext, createSignal, onMount } from 'solid-js';
import { createStorageAdapter } from './indexeddb-adapter';
import type { StoragePort } from './types';

/**
 * Storage context value.
 */
interface StorageContextValue {
  storage: StoragePort;
  isReady: () => boolean;
  error: () => string | null;
}

const StorageContext = createContext<StorageContextValue>();

/**
 * Storage provider component.
 * Initializes the storage adapter and provides it to the component tree.
 */
export const StorageProvider: ParentComponent = (props) => {
  const [isReady, setIsReady] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const storage = createStorageAdapter();

  onMount(async () => {
    try {
      await storage.initialize();
      setIsReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to initialize storage');
    }
  });

  const value: StorageContextValue = {
    storage,
    isReady,
    error,
  };

  return (
    <StorageContext.Provider value={value}>
      {props.children}
    </StorageContext.Provider>
  );
};

/**
 * Hook to access the storage context.
 */
export function useStorage(): StorageContextValue {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
}
