import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.swung.app',
  appName: 'SWUNG',
  webDir: 'www',  // Bundle static HTML/CSS/JS in APK
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;


