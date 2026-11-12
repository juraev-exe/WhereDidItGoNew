import { registerPlugin } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { isNative } from '@/lib/platform'

const PrivacyScreen = registerPlugin<{
  setSecure(options: { enabled: boolean }): Promise<void>
}>('PrivacyScreen')

export async function applyPrivacyScreen(enabled: boolean): Promise<void> {
  if (!isNative()) return
  try {
    await PrivacyScreen.setSecure({ enabled })
  } catch {
    // ignore on platforms without native plugin
  }
}

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
