import './polyfills';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { indexedDBPersister } from './lib/queryPersister';
import { logError } from './lib/supabase';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevents excessive Supabase pings
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days garbage collection time (replaces cacheTime in v5)
    },
  },
});

// Configure React Query Persistence in IndexedDB with Security Filters
persistQueryClient({
  queryClient,
  persister: indexedDBPersister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      // Security rule: Do not persist sensitive information in plain text
      const sensitiveKeys = ['clientes', 'pedidos', 'empresas', 'agenda', 'dashboard', 'emails', 'valores', 'auth'];
      const isSensitive = query.queryKey.some(key => 
         typeof key === 'string' && sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))
      );
      return !isSensitive && query.state.status === 'success';
    }
  }
});

// Register Global Error Listeners for Telemetry
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Avoid double logging if event has no error details
    const err = event.error || event.message || 'Erro de script desconhecido';
    logError(err, 'global_error_listener');
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason || 'Rejeição de Promise sem motivo especificado';
    logError(reason, 'global_unhandled_rejection');
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
