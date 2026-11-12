import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

// Στο web server rendering (Node) δεν υπάρχει window/localStorage, οπότε δεν αποθηκεύεται session.
const isServer = process.env.EXPO_OS === 'web' && typeof window === 'undefined';

export const supabaseConfigured = Boolean(url && anonKey);
export const supabase = createClient(url || 'http://localhost', anonKey || 'missing', {
  auth: {
    storage: isServer ? undefined : AsyncStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// Επιστρέφει το id του συνδεδεμένου χρήστη.
export async function ensureSession(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Απαιτείται σύνδεση');
  return data.session.user.id;
}
