import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { isNative } from '@/lib/platform'

export async function applyStatusBar(theme: 'light' | 'dark' | 'oled'): Promise<void> {
  if (!isNative()) return
  try {
    const isDark = theme === 'dark' || theme === 'oled'
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light })
    await StatusBar.setBackgroundColor({
      color: theme === 'oled' ? '#000000' : theme === 'dark' ? '#121413' : '#f3f0ea',
    })
  } catch {
    // ignore
  }
}

export async function hideSplash(): Promise<void> {
  if (!isNative()) return
  try {
    await SplashScreen.hide()
  } catch {
    // ignore
  }
}
