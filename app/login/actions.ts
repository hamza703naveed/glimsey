"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function signIn(form: FormData) {
  const db = await supabase();
  const { error } = await db.auth.signInWithPassword({
    email: String(form.get("email")),
    password: String(form.get("password")),
  });
  if (error) redirect(`/login?error=${encodeURIComponent("البريد أو كلمة المرور غير صحيحة")}`);
  const next = String(form.get("next") || "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/"); // no open redirects
}

export async function signUp(form: FormData) {
  const db = await supabase();
  const role = form.get("role") === "vendor" ? "vendor" : "customer";
  const { data, error } = await db.auth.signUp({
    email: String(form.get("email")),
    password: String(form.get("password")),
    options: { data: { role, full_name: String(form.get("full_name") ?? "") } },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  // With email confirmation on, there is no session until the user clicks the link.
  if (!data.session) redirect(`/login?message=${encodeURIComponent("تحقق من بريدك الإلكتروني لتأكيد الحساب")}`);
  redirect(role === "vendor" ? "/vendor/profile" : "/");
}

export async function signOut() {
  const db = await supabase();
  await db.auth.signOut();
  redirect("/");
}
