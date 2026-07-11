import { supabase } from "../lib/supabaseClient";

export async function syncUserTimezone() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase
    .from("users")
    .update({
      Timezone: timezone,
    })
    .eq("Id", user.id);

  if (error) {
    console.warn("Failed to sync timezone:", error);
  }
}
