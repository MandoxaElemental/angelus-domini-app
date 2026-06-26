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
