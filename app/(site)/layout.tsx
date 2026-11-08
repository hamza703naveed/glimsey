import Link from "next/link";
import { currentUser } from "@/lib/supabase";
import { signOut } from "./login/actions";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await currentUser();
  return (
    <>
      <header className="border-b border-stone-200 bg-white">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
          <Link href="/" className="text-xl font-bold text-rose-700">Glimsey</Link>
          <Link href="/vendors">المزودون</Link>
          <Link href="/requests/new">اطلب عروض أسعار</Link>
          {user && <Link href="/requests">طلباتي</Link>}
          {role === "vendor" && <Link href="/vendor/profile">ملفي التجاري</Link>}
          {role === "admin" && <Link href="/admin">الإدارة</Link>}
          <span className="flex-1" />
          {user ? (
            <form action={signOut}><button className="text-stone-600">تسجيل الخروج</button></form>
          ) : (
            <Link href="/login" className="btn">دخول / تسجيل</Link>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}
