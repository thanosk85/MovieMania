import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';

import { LogoMark, Wordmark } from '@/components/logo';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

// Στο web το popup του OAuth στέλνει το URL στο κύριο παράθυρο και κλείνει· δεν ανταλλάσσει το ίδιο τον κωδικό.
const isAuthPopup = WebBrowser.maybeCompleteAuthSession().type === 'success';

const FAILED = 'Η σύνδεση με Google απέτυχε. Δοκίμασε ξανά.';

// Το Expo Go δεν χειρίζεται το custom scheme της εφαρμογής, μόνο exp://
// Τα development/production builds χρησιμοποιούν το scheme της εφαρμογής (myapp://login).
function getRedirectUrl() {
  const host = Constants.expoConfig?.hostUri;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient && host) {
    return `exp://${host}/--/login`;
  }
  return Linking.createURL('login');
}

type AuthResult = { code?: string; error?: string; flowId?: string };

// Το Supabase επιστρέφει ?code=...&sb_flow_id=... σε επιτυχία ή error/error_description (query ή fragment) σε αποτυχία.
function parseAuthUrl(url: string | null | undefined): AuthResult {
  if (!url) return {};
  const [beforeHash, hash = ''] = url.split('#');
  const queryStart = beforeHash.indexOf('?');
  const params = new URLSearchParams(`${queryStart === -1 ? '' : beforeHash.slice(queryStart + 1)}&${hash}`);
  return {
    code: params.get('code') ?? undefined,
    error: params.get('error_description') ?? params.get('error') ?? undefined,
    flowId: params.get('sb_flow_id') ?? undefined,
  };
}

// Στο Android ο κωδικός φτάνει και από το auth session και από το deep link (που μπορεί να ανοίξει
// δεύτερη οθόνη login). Κρατιέται σε επίπεδο module ώστε να ανταλλαχθεί μόνο μία φορά.
let handledCode: string | null = null;

// Επιστρέφει μήνυμα σφάλματος ή null.
async function exchangeCode(code: string | undefined, flowId: string | undefined): Promise<string | null> {
  if (isAuthPopup || !code || handledCode === code) return null;
  handledCode = code;
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    if (error) throw error;
    return null;
  } catch (e) {
    console.warn('[auth] exchange failed:', e);
    return `${FAILED}\n(${e instanceof Error ? e.message : String(e)})`;
  }
}

export default function LoginScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string; sb_flow_id?: string }>();
  const { session } = useSession();
  const linkingUrl = Linking.useLinkingURL();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  // Το deep link μπορεί να φτάσει ως παράμετροι της διαδρομής ή μόνο ως linking URL.
  const fromUrl = parseAuthUrl(linkingUrl);
  const code = params.code ?? fromUrl.code;
  const flowId = params.sb_flow_id ?? fromUrl.flowId;
  const oauthError = isAuthPopup ? undefined : (params.error_description ?? params.error ?? fromUrl.error);
  const visibleMessage = message ?? (oauthError && oauthError !== dismissedError ? `${FAILED}\n(${oauthError})` : null);

  useEffect(() => {
    if (visibleMessage) AccessibilityInfo.announceForAccessibility(visibleMessage);
  }, [visibleMessage]);

  useEffect(() => {
    if (session) router.replace('/(tabs)');
  }, [session]);

  useEffect(() => {
    exchangeCode(code, flowId).then((error) => {
      if (error) setMessage(error);
    });
  }, [code, flowId]);

  async function signInWithGoogle() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    setDismissedError(oauthError ?? null);
    try {
      const redirectTo = getRedirectUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data.url) throw error ?? new Error('Missing OAuth url');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      console.log('[auth] redirectTo:', redirectTo, 'result:', result.type);
      // Στο Android το αποτέλεσμα είναι συχνά "dismiss" και ο κωδικός φτάνει μέσω του deep link.
      if (result.type === 'success') {
        const returned = parseAuthUrl(result.url);
        const failure = returned.error ? `${FAILED}\n(${returned.error})` : await exchangeCode(returned.code, returned.flowId);
        if (failure) setMessage(failure);
      }
    } catch (e) {
      console.warn('[auth] sign-in failed:', e);
      setMessage(FAILED);
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

      {visibleMessage ? (
        <Text accessibilityRole="alert" style={{ color: theme.text, textAlign: 'center' }}>
          {visibleMessage}
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
