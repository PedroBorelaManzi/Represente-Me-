import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';

export class NotificationService {
  static async initialize() {
    if (!Capacitor.isNativePlatform()) return;
    
    // Request permissions
    const permStatus = await LocalNotifications.requestPermissions();
    if (permStatus.display !== 'granted') return;

    // Register realtime channel for orders
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    supabase
      .channel('public:orders')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        async (payload) => {
          // Check if status changed
          if (payload.new.status !== payload.old.status) {
            await this.scheduleStatusNotification(payload.new);
          }
        }
      )
      .subscribe();

    this.scheduleTomorrowReminders(user.id);
  }

  static async scheduleStatusNotification(order: any) {
    if (!Capacitor.isNativePlatform()) return;

    await LocalNotifications.schedule({
      notifications: [
        {
          title: "Atualização de Pedido",
          body: `O pedido de ${order.category} mudou para: ${order.status}`,
          id: Math.floor(Math.random() * 100000),
          schedule: { at: new Date(Date.now() + 1000) },
          actionTypeId: "",
          extra: null
        }
      ]
    });
  }

  static async scheduleTomorrowReminders(userId: string) {
    if (!Capacitor.isNativePlatform()) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: appointments } = await supabase
      .from('appointments')
      .select('title, time')
      .eq('user_id', userId)
      .eq('date', tomorrowStr);

    if (appointments && appointments.length > 0) {
      await LocalNotifications.schedule({
        notifications: appointments.map((app, index) => {
          const [hours, minutes] = app.time.split(':');
          const scheduleDate = new Date();
          scheduleDate.setDate(scheduleDate.getDate() + 1);
          scheduleDate.setHours(8, 0, 0, 0); // Notificar as 8 da manha do dia do compromisso

          return {
            title: "Lembrete de Visita",
            body: `Você tem uma visita amanhã: ${app.title} às ${app.time}`,
            id: 200000 + index,
            schedule: { at: scheduleDate },
            actionTypeId: "",
            extra: null
          };
        })
      });
    }
  }
}
