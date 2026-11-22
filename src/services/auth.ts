import { supabase } from "./supabase";

const usernameToAuthEmail = (username: string) =>
  `${username.trim().toLowerCase()}@word-safari-login.com`;

export const isValidUsername = (username: string) =>
  /^[a-zA-Z0-9_.-]{3,24}$/.test(username);

export async function signIn(username: string, password: string) {
  return supabase.auth.signInWithPassword({
    email: usernameToAuthEmail(username),
    password,
  });
}

export async function signUp(username: string, password: string) {
  return supabase.auth.signUp({
    email: usernameToAuthEmail(username),
    password,
    options: {
      data: {
        username: username.trim().toLowerCase(),
        learner_name: username.trim().toLowerCase(),
      },
    },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;

  return data.user;
}