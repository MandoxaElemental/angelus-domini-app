import { supabase } from "../lib/supabaseClient";

export async function getUserId(): Promise<string> {
  let { data: { session } } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    await new Promise<void>((resolve) => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, s) => {
          if (s) {
            session = s;
            subscription.unsubscribe();
            resolve();
          }
        }
      );
      setTimeout(resolve, 5000);
    });
  }

  if (!session?.user?.id) throw new Error("No authenticated user");
  return session.user.id;
}