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

let inFlightRefresh: ReturnType<typeof supabase.auth.refreshSession> | null =
  null;

export function safeRefreshSession() {
  if (!inFlightRefresh) {
    inFlightRefresh = supabase.auth.refreshSession().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}
