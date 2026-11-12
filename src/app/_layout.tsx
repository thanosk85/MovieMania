import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';

import { AppHeader } from '@/components/logo';
import { SplashOverlay } from '@/components/splash-overlay';
import { Colors } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';

const c = Colors.light;
const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: c.text,
    background: c.background,
    card: c.background,
    text: c.text,
    border: c.backgroundElement,
  },
};

export default function RootLayout() {
  const { ready } = useSession();
  return (
    <ThemeProvider value={navTheme}>
      <Stack screenOptions={{ header: () => <AppHeader back /> }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="movie/[id]" />
        <Stack.Screen name="login" options={{ presentation: 'modal' }} />
      </Stack>
      <SplashOverlay ready={ready} />
    </ThemeProvider>
  );
}
