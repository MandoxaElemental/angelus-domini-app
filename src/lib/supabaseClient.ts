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

/**
 * Call this before any authenticated Supabase query.
 * If the session is expired and cannot be refreshed, signs out and returns null.
 */
export async function getValidSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;

    const expiresAt = data.session.expires_at ?? 0;
    const nowSec = Math.floor(Date.now() / 1000);

    if (expiresAt < nowSec) {
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr || !refreshed.session) {
        console.warn("[Auth] Could not refresh expired session — signing out.");
        await supabase.auth.signOut();
        return null;
      }
      return refreshed.session;
    }

    return data.session;
  } catch (err) {
    console.warn("[Auth] getValidSession error:", err);
    return null;
  }
}

/**
 * Returns true if the error is a JWT expiry error from PostgREST or Supabase auth.
 */
export function isJwtExpiredError(err: any): boolean {
  if (!err) return false;
  return (
    err?.code === "PGRST303" ||
    err?.message?.includes("JWT expired") ||
    err?.message?.includes("invalid JWT") ||
    err?.status === 401
  );
}