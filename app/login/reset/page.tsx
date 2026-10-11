import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase";
import { setPassword } from "../actions";

export default async function ResetPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { error } = await searchParams;
  const { user } = await currentUser();
  if (!user) redirect("/login/forgot"); // the reset link signs the user in via /auth/callback
  return (
    <form action={setPassword} className="card mx-auto grid max-w-md gap-3">
      <h1 className="text-lg font-bold">كلمة مرور جديدة</h1>
      {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      <label>كلمة المرور الجديدة<input className="input" name="password" type="password" minLength={8} required /></label>
      <button className="btn">حفظ</button>
    </form>
  );
}
