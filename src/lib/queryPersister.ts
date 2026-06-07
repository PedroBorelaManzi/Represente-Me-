import { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { getFromIndexedDB, saveToIndexedDB, removeFromIndexedDB } from './storage';

export const indexedDBPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    try {
      await saveToIndexedDB('reactQueryCache', client);
    } catch (e) {
      console.warn('[queryPersister] Failed to persist client to IndexedDB', e);
    }
  },
  restoreClient: async () => {
    try {
      const client = await getFromIndexedDB('reactQueryCache');
      return client || undefined;
    } catch (e) {
      console.warn('[queryPersister] Failed to restore client from IndexedDB', e);
      return undefined;
    }
  },
  removeClient: async () => {
    try {
      await removeFromIndexedDB('reactQueryCache');
    } catch (e) {
      console.warn('[queryPersister] Failed to remove client from IndexedDB', e);
    }
  },
};
