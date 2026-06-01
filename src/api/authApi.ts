import { supabase } from "../lib/supabaseClient";

export const register = async (
  email: string,
  username: string,
  password: string,
  country?: string,
) => {
  // 1. Create auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error("No user returned");

  // 2. Save to your existing users table
  const { error: insertError } = await supabase.from("users").insert({
    Id: data.user.id,
    Username: username,
    Email: email,
    Country: country ?? null,
    Salt: "supabase_managed",
    Hash: "supabase_managed",
    CreatedAt: new Date().toISOString(),
  });

  if (insertError) throw insertError;

  // 3. Auto sign in immediately
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (signInError) throw signInError;

  return signInData; // ✅ session always exists
};

export const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  console.log("LOGIN DATA:", data);
  console.log("LOGIN ERROR:", error);

  if (error) throw error;

  return {
    token: data.session?.access_token,
    userId: data.user?.id,
    username: data.user?.user_metadata?.username,
  };
};
