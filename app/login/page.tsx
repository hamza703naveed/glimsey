import { signIn, signUp } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { error, message, next } = await searchParams;
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {error && <p className="md:col-span-2 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      {message && <p className="md:col-span-2 rounded-lg bg-green-50 p-3 text-green-700">{message}</p>}
      <form action={signIn} className="card grid gap-3">
        <h1 className="text-lg font-bold">تسجيل الدخول</h1>
        <input type="hidden" name="next" value={next ?? "/"} />
        <label>البريد الإلكتروني<input className="input" name="email" type="email" required /></label>
        <label>كلمة المرور<input className="input" name="password" type="password" required /></label>
        <button className="btn">دخول</button>
      </form>
      <form action={signUp} className="card grid gap-3">
        <h2 className="text-lg font-bold">حساب جديد</h2>
        <label>الاسم<input className="input" name="full_name" required /></label>
        <label>البريد الإلكتروني<input className="input" name="email" type="email" required /></label>
        <label>كلمة المرور<input className="input" name="password" type="password" minLength={8} required /></label>
        <fieldset className="flex gap-4">
          <label><input type="radio" name="role" value="customer" defaultChecked /> أبحث عن مزود خدمة</label>
          <label><input type="radio" name="role" value="vendor" /> أنا مزود خدمة</label>
        </fieldset>
        <button className="btn">إنشاء حساب</button>
      </form>
    </div>
  );
}
