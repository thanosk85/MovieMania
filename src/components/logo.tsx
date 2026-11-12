import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

const GOLD_LIGHT = '#D4A94B';

export function LogoMark({ size = 36, inverted = false }: { size?: number; inverted?: boolean }) {
  const ink = '#1A1A1A';
  const paper = '#FAF8F5';
  const tri = size * 0.3;
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: inverted ? paper : ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View
        style={{
          marginLeft: tri * 0.3,
          width: 0,
          height: 0,
          borderTopWidth: tri * 0.75,
          borderBottomWidth: tri * 0.75,
          borderLeftWidth: tri * 1.3,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: inverted ? ink : paper,
        }}
      />
      <Text style={{ position: 'absolute', top: size * 0.02, right: size * 0.06, fontSize: size * 0.3, color: GOLD_LIGHT }}>
        ★
      </Text>
    </View>
  );
}

export function Wordmark({ size = 24, inverted = false }: { size?: number; inverted?: boolean }) {
  const theme = useTheme();
  return (
    <Text style={{ fontSize: size, fontWeight: '800' }}>
      <Text style={{ color: inverted ? '#FAF8F5' : theme.text }}>Movie</Text>
      <Text style={{ color: inverted ? GOLD_LIGHT : theme.accent }}>Mania</Text>
    </Text>
  );
}

export function AppHeader({ back = false }: { back?: boolean }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.background }]}>
      {back && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Πίσω"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.back}>
          <Text style={{ color: theme.text, fontSize: 28 }}>‹</Text>
        </Pressable>
      )}
      <View accessible accessibilityRole="header" accessibilityLabel="MovieMania" style={styles.row}>
        <LogoMark size={36} />
        <Wordmark size={24} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginLeft: -12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
