import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = "https://tfkrxheixitapzjwngxe.supabase.co";
const supabaseAnonKey = "sb_publishable_wTzox7eQLWxFV40WKZyfWg_mhul5m5G";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// FIX: Supabase refresh tokens rotate — once used, the previous one is
// invalidated. Multiple parts of the app were independently calling
// refreshSession() (the offline sync loop every 20s, MainApp on mount,
// plus Supabase's own autoRefreshToken timer). If two of these land close
// together, the second one gets rejected as "Already Used" and forces a
// real sign-out. This wrapper dedupes concurrent calls into a single
// shared in-flight refresh so only one refreshSession() request is ever
// in flight app-wide at a time.
let inFlightRefresh: ReturnType<typeof supabase.auth.refreshSession> | null = null;

export function safeRefreshSession() {
  if (!inFlightRefresh) {
    inFlightRefresh = supabase.auth.refreshSession().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}