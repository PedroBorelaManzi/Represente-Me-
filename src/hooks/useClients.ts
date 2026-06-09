import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { Client, Alert, Order } from '../types';

export function useClients() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['clients', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // 1. Get current cached clients
      const cachedClients = queryClient.getQueryData<Client[]>(['clients', user.id]) || [];
      
      let maxUpdatedAt = '1970-01-01T00:00:00.000Z';
      if (cachedClients.length > 0) {
        cachedClients.forEach(c => {
          if (c.updated_at && c.updated_at > maxUpdatedAt) {
            maxUpdatedAt = c.updated_at;
          }
        });
      }

      // 2. Fetch ALL current IDs to handle hard-deletions
      const { data: allIdsData, error: idsError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id);

      if (idsError) throw idsError;
      
      const validIds = new Set(allIdsData.map(r => r.id));

      // 3. Fetch ONLY clients modified AFTER the maxUpdatedAt
      const { data: newOrUpdatedClients, error } = await supabase
        .from('clients')
        .select(`
          id, name, cnpj, city, address, status, last_contact, created_at, updated_at, lat, lng, phone, email,
          orders (
            client_id,
            file_name,
            created_at,
            category,
            file_path
          )
        `)
        .eq('user_id', user.id)
        .gt('updated_at', maxUpdatedAt)
        .order('name', { ascending: true });

      if (error) throw error;

      // Process new clients for alerts and last orders (for Map and CRM)
      const categoryLookup = new Map<string, string>();
      settings?.categories?.forEach((c: string) => categoryLookup.set(c.toLowerCase(), c));

      const processedNewClients: Client[] = (newOrUpdatedClients || []).map((client: any) => {
        const clientFiles = client.orders || [];
        const lastDates: Record<string, number> = {};
        const lastOrdersByCategory: Record<string, any> = {};
        
        clientFiles.forEach((f: any) => {
          if (!f.file_name) return;
          const parts = f.file_name.split("___");
          const rawCatLower = parts.length > 1 ? parts[0].toLowerCase() : (f.category || "GERAL").toLowerCase();
          const cat = categoryLookup.get(rawCatLower) || (parts.length > 1 ? parts[0] : (f.category || "GERAL"));
          
          const normalize = (s: string) => s?.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase().trim();
          const catKey = normalize(cat);
          
          if (!lastOrdersByCategory[catKey] || new Date(f.created_at) > new Date(lastOrdersByCategory[catKey].created_at)) {
             lastOrdersByCategory[catKey] = f;
          }

          const date = new Date(f.created_at).getTime();
          if (!lastDates[cat] || date > lastDates[cat]) lastDates[cat] = date;
        });

        const alerts: Alert[] = [];
        const today = new Date().getTime();
        for (const [cat, date] of Object.entries(lastDates)) {
          const days = Math.floor((today - date) / (1000 * 60 * 60 * 24));
          if (days >= (settings?.inativo_days || 90)) {
            alerts.push({ company: cat, type: "Inativo", days });
          } else if (days >= (settings?.critico_days || 45)) {
            alerts.push({ company: cat, type: "Crítico", days });
          } else if (days >= (settings?.alerta_days || 30)) {
            alerts.push({ company: cat, type: "Alerta", days });
          }
        }

        const { orders, ...clientWithoutOrders } = client;
        return {
          ...clientWithoutOrders,
          lastOrdersByCategory,
          alerts: alerts.sort((a, b) => b.days - a.days)
        };
      });

      // 4. Merge Delta with Cache and Remove Deleted
      const clientMap = new Map<string, Client>();
      
      // Put cached clients in map ONLY IF their ID still exists in Supabase
      cachedClients.forEach(c => {
         if (validIds.has(c.id)) {
             clientMap.set(c.id, c);
         }
      });
      
      // Overwrite/Add the newly fetched updated clients
      processedNewClients.forEach(c => clientMap.set(c.id, c));

      return Array.from(clientMap.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    },
    enabled: !!user && !!settings,
  });
}
