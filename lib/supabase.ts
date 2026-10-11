import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// One server-side client per request; RLS in supabase/schema.sql decides what each user may read or write.
export async function supabase() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: the middleware refreshes the session instead.
        }
      },
    },
  });
}

export async function currentUser() {
  const db = await supabase();
  const { data } = await db.auth.getUser();
  if (!data.user) return { db, user: null, role: null as string | null };
  const { data: profile } = await db.from("profiles").select("role").eq("id", data.user.id).single();
  return { db, user: data.user, role: (profile?.role ?? "customer") as string };
}
