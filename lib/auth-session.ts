import { supabase } from "./supabase";

export async function safeGetAccessToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("Unable to read auth session", error);
      return null;
    }
    return data.session?.access_token ?? null;
  } catch (err) {
    console.warn("Auth session request failed", err);
    return null;
  }
}
