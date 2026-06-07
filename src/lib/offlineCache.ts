// src/lib/offlineCache.ts

export const CacheKeys = {
  CLIENTS: 'rm_cache_clients',
  MONTHLY_ORDERS: 'rm_cache_monthly_orders',
  ORDERS: 'rm_cache_orders',
  USER_SETTINGS: 'rm_cache_user_settings',
  APPOINTMENTS: 'rm_cache_appointments',
  ALL_TIME_CATEGORIES: 'rm_cache_all_time_categories',
};

export const offlineCache = {
  set: (key: string, data: any, ttlMs: number = 24 * 60 * 60 * 1000) => {
    try {
      sessionStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now(),
        expiry: Date.now() + ttlMs
      }));
    } catch (e) {
      console.error('Erro ao gravar no cache offline:', e);
    }
  },
  
  get: <T>(key: string): T | null => {
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return null;
      const parsed = JSON.parse(item);
      
      if (parsed.expiry && Date.now() > parsed.expiry) {
        sessionStorage.removeItem(key);
        return null;
      }
      
      // Backward compatibility check for old cache without expiry field
      if (!parsed.expiry && parsed.timestamp && Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
        sessionStorage.removeItem(key);
        return null;
      }
      
      return parsed.data as T;
    } catch (e) {
      console.error('Erro ao ler do cache offline:', e);
      return null;
    }
  },
  
  clear: () => {
    Object.values(CacheKeys).forEach(key => {
      sessionStorage.removeItem(key);
    });
  },

  isOnline: (): boolean => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }
};
