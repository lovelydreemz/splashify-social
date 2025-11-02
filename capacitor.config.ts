import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.caaae95f71904859b66ffc60dd24eec6',
  appName: 'Splashify Social',
  webDir: 'dist',
  server: {
    url: 'https://caaae95f-7190-4859-b66f-fc60dd24eec6.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
