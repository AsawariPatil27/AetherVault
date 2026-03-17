import { supabase } from "./supabase";

// SIGNUP (with email verification + error handling)
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "http://localhost:5173/login",
    },
  });

  return { data, error };
}

// LOGIN
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

// LOGOUT
export async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.log(error.message);
  }
}