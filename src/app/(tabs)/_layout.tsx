import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/logo';
import { useTheme } from '@/hooks/use-theme';

const TABS = [
  { name: 'index', title: 'Ταινίες', icon: 'film' },
  { name: 'search', title: 'Αναζήτηση', icon: 'search' },
  { name: 'watchlist', title: 'Λίστα', icon: 'bookmark' },
  { name: 'profile', title: 'Προφίλ', icon: 'person' },
] as const;

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        header: () => <AppHeader />,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.backgroundElement,
          height: 64 + insets.bottom,
          paddingTop: 0,
          paddingBottom: insets.bottom,
        },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarButton: ({ onPress, onLongPress, accessibilityState, testID }) => {
              const focused = accessibilityState?.selected;
              return (
                <Pressable
                  onPress={onPress}
                  onLongPress={onLongPress}
                  testID={testID}
                  accessibilityRole="tab"
                  accessibilityState={accessibilityState}
                  accessibilityLabel={t.title}
                  style={{ flex: 1, height: 64, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={focused ? t.icon : (`${t.icon}-outline` as typeof t.icon)} size={26} color={focused ? theme.text : theme.textSecondary} />
                </Pressable>
              );
            },
          }}
        />
      ))}
    </Tabs>
  );
}
