import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';

import { LogoMark, Wordmark } from '@/components/logo';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

// Το Expo Go δεν χειρίζεται το custom scheme της εφαρμογής, μόνο exp://
// Τα development/production builds χρησιμοποιούν το scheme της εφαρμογής (myapp://login).
function getRedirectUrl() {
  const host = Constants.expoConfig?.hostUri;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient && host) {
    return `exp://${host}/--/login`;
  }
  return Linking.createURL('login');
}

export default function LoginScreen() {
  const theme = useTheme();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { session } = useSession();
  const rawUrl = Linking.useLinkingURL();
  useEffect(() => {
    console.warn('[auth-debug] url:', rawUrl?.replace(/code=[^&#]+/, 'code=<redacted>'), 'codeParam:', typeof code, 'session:', Boolean(session));
  }, [rawUrl, code, session]);
  const handledCode = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const show = useCallback((text: string) => {
    setMessage(text);
    AccessibilityInfo.announceForAccessibility(text);
  }, []);

  const exchange = useCallback(async (authCode: string): Promise<boolean> => {
    if (handledCode.current === authCode) return true;
    handledCode.current = authCode;
    const { error } = await supabase.auth.exchangeCodeForSession(authCode);
    console.warn('[auth-debug] exchange error:', error?.message ?? 'none');
    if (error) {
      console.warn(error);
      return false;
    }
    return true;
  }, []);

  useEffect(() => {
    if (session) router.replace('/(tabs)');
  }, [session]);

  useEffect(() => {
    if (typeof code === 'string') {
      exchange(code).then((ok) => {
        if (!ok) show('Η σύνδεση με Google απέτυχε. Δοκίμασε ξανά.');
      });
    }
  }, [code, exchange, show]);

  async function signInWithGoogle() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const redirectTo = getRedirectUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data.url) throw error ?? new Error('Missing OAuth url');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      console.warn('[auth-debug] redirectTo:', redirectTo, 'result:', result.type, 'url' in result ? result.url.replace(/code=[^&#]+/, 'code=<redacted>') : '');
      if (result.type === 'success') {
        const returned = Linking.parse(result.url).queryParams?.code;
        if (typeof returned === 'string' && !(await exchange(returned))) {
          show('Η σύνδεση με Google απέτυχε. Δοκίμασε ξανά.');
        }
      }
    } catch (e) {
      console.warn(e);
      show('Η σύνδεση με Google απέτυχε. Δοκίμασε ξανά.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.content}>
      <LogoMark size={72} />
      <Wordmark size={32} />
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        Σύνδεση
      </Text>
      <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
        Συνδέσου με τον λογαριασμό σου Google για να βαθμολογήσεις ταινίες.
      </Text>

      {message ? (
        <Text accessibilityRole="alert" style={{ color: theme.text }}>
          {message}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy }}
        onPress={signInWithGoogle}
        style={StyleSheet.flatten([styles.button, { backgroundColor: theme.text }])}>
        <Text style={{ color: theme.background, fontWeight: '600' }}>
          {busy ? 'Παρακαλώ περίμενε…' : 'Σύνδεση με Google'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 16, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '700' },
  button: { alignSelf: 'stretch', minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
