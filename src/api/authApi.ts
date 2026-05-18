import { supabase } from "../lib/supabaseClient";

export const register = async (
  email: string,
  password: string,
  username: string
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username }, // stored in user metadata
    },
  });

  if (error) throw error;
  return data;
};

export const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return {
    token: data.session?.access_token,
    userId: data.user?.id,
    username: data.user?.user_metadata?.username,
  };
};