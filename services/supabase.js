import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://nrwfszpxnrelzajffhhj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yGxZQtku3Ebp4I1XWuGgYg_BAuy4Q4K';

// Configuramos la persistencia adaptativa según la plataforma
const customStorage = Platform.OS === 'web' ? undefined : AsyncStorage;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    ...(customStorage ? { storage: customStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});