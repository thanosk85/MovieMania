import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';

import { LogoMark, Wordmark } from '@/components/logo';

SplashScreen.preventAutoHideAsync().catch(() => {});

const MIN_VISIBLE_MS = 1400;

// Εμφανίζεται πάνω από την εφαρμογή μέχρι να είναι έτοιμη, και μετά σβήνει.
export function SplashOverlay({ ready }: { ready: boolean }) {
  const [opacity] = useState(() => new Animated.Value(1));
  const [minElapsed, setMinElapsed] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready && minElapsed) {
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: process.env.EXPO_OS !== 'web' }).start(() => setGone(true));
    }
  }, [ready, minElapsed, opacity]);

  useEffect(() => {
    if (process.env.EXPO_OS === 'web') SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (gone) return null;

  const content = (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Φόρτωση MovieMania"
      accessible
      style={[styles.root, { opacity }]}>
      <View style={styles.center}>
        <LogoMark size={96} inverted />
        <Wordmark size={40} inverted />
        <Text style={styles.tagline}>Βαθμολόγησε ό,τι βλέπεις</Text>
      </View>
    </Animated.View>
  );

  // Στο web το Modal αποδίδεται μέσω portal που δεν υπάρχει στο server rendering (hydration mismatch).
  if (process.env.EXPO_OS === 'web') return content;

  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="none" onShow={() => SplashScreen.hideAsync().catch(() => {})}>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 1000, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 20 },
  tagline: { color: '#C9C3B8', fontSize: 15 },
});
