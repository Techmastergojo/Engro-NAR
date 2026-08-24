import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.engro.nar',
  appName: 'Engro NAR',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#0A192F',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    }
  }
};

export default config;
