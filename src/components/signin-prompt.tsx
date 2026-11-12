import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function SignInPrompt({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <Text style={[styles.message, { color: theme.text }]}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/login')}
        style={[styles.button, { backgroundColor: theme.text }]}>
        <Text style={{ color: theme.background, fontWeight: '600' }}>Σύνδεση</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  message: { fontSize: 16, textAlign: 'center' },
  button: { minHeight: 48, paddingHorizontal: 28, borderRadius: 24, justifyContent: 'center' },
});
