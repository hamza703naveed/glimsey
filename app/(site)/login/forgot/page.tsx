import { sendReset } from "../actions";

export default async function ForgotPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { message } = await searchParams;
  return (
    <form action={sendReset} className="card mx-auto grid max-w-md gap-3">
      <h1 className="text-lg font-bold">استعادة كلمة المرور</h1>
      {message && <p className="rounded-lg bg-green-50 p-3 text-green-700">{message}</p>}
      <label>البريد الإلكتروني<input className="input" name="email" type="email" required /></label>
      <button className="btn">أرسل رابط الاستعادة</button>
    </form>
  );
}
