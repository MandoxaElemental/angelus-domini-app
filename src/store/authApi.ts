import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

export const register = async (
  email: string,
  username: string,
  password: string
) => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  console.log("CLEAN INPUT:", {
    email: cleanEmail,
    length: cleanEmail.length,
  });

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: cleanPassword,
  });

  console.log("SUPABASE RESPONSE:", { data, error });

  if (error) throw error;

  return data;
};