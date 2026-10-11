"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { safePath } from "@/lib/constants";

const back = (page: string, key: "error" | "message", text: string): never => redirect(`${page}?${key}=${encodeURIComponent(text)}`);
// Email links (confirm, reset) come back through /auth/callback, which signs the user in.
const callback = async (next: string) => `${(await headers()).get("origin")}/auth/callback?next=${encodeURIComponent(next)}`;

export async function signIn(form: FormData) {
  const db = await supabase();
  const { error } = await db.auth.signInWithPassword({
    email: String(form.get("email")),
    password: String(form.get("password")),
  });
  if (error?.code === "email_not_confirmed") back("/login", "error", "يرجى تأكيد بريدك الإلكتروني أولاً من الرابط المرسل إليك");
  if (error) back("/login", "error", "البريد أو كلمة المرور غير صحيحة");
  redirect(safePath(String(form.get("next") ?? "")));
}

export async function signUp(form: FormData) {
  const db = await supabase();
  const role = form.get("role") === "vendor" ? "vendor" : "customer";
  const home = role === "vendor" ? "/vendor/profile" : "/";
  const { data, error } = await db.auth.signUp({
    email: String(form.get("email")),
    password: String(form.get("password")),
    options: { data: { role, full_name: String(form.get("full_name") ?? "") }, emailRedirectTo: await callback(home) },
  });
  if (error?.code === "user_already_exists") back("/login", "error", "هذا البريد مسجّل من قبل. سجّل الدخول أو استعد كلمة المرور");
  if (error?.code === "weak_password") back("/login", "error", "كلمة المرور ضعيفة، استخدم 8 أحرف على الأقل مع أرقام");
  if (error) back("/login", "error", "تعذر إنشاء الحساب، حاول مرة أخرى");
  // With email confirmation on, there is no session until the user clicks the link.
  if (!data.session) back("/login", "message", "تحقق من بريدك الإلكتروني لتأكيد الحساب");
  redirect(home);
}

export async function sendReset(form: FormData) {
  const db = await supabase();
  await db.auth.resetPasswordForEmail(String(form.get("email")), { redirectTo: await callback("/login/reset") });
  // Same answer whether or not the email exists, so the form can't be used to find accounts.
  back("/login/forgot", "message", "إذا كان البريد مسجّلاً فستصلك رسالة لاستعادة كلمة المرور");
}

export async function setPassword(form: FormData) {
  const db = await supabase();
  const { error } = await db.auth.updateUser({ password: String(form.get("password")) });
  if (error) back("/login/reset", "error", "تعذر تغيير كلمة المرور. اطلب رابطاً جديداً واستخدم 8 أحرف على الأقل");
  redirect("/");
}

export async function signOut() {
  const db = await supabase();
  await db.auth.signOut();
  redirect("/");
}
