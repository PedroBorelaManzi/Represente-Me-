import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.representeme.app',
  appName: 'Represente-Me',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_launcher",
      iconColor: "#10b981"
    }
  }
};

export default config;
