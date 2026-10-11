import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CITIES } from "@/lib/constants";

export default async function Home() {
  const db = await supabase();
  const { data: categories } = await db.from("categories").select("id, name_ar").order("id");
  return (
    <div className="grid gap-10">
      <section className="grid gap-4 text-center">
        <h1 className="text-3xl font-bold">كل ما تحتاجه لمناسبتك، في مكان واحد</h1>
        <p className="text-stone-600">ابحث عن مزودي خدمات موثوقين، أو صف مناسبتك ودع المزودين يرسلون لك عروضهم.</p>
        <form action="/vendors" className="mx-auto flex w-full max-w-xl flex-wrap gap-2">
          <select name="category" className="input flex-1" aria-label="الفئة">
            <option value="">كل الفئات</option>
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
          </select>
          <select name="city" className="input flex-1" aria-label="المدينة">
            <option value="">كل المدن</option>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button className="btn">بحث</button>
        </form>
        <p><Link href="/requests/new" className="font-semibold text-rose-700 underline">أو اطلب عروض أسعار من عدة مزودين</Link></p>
      </section>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {categories?.map((c) => (
          <Link key={c.id} href={`/vendors?category=${c.id}`} className="card text-center font-semibold hover:border-rose-300">
            {c.name_ar}
          </Link>
        ))}
      </section>
    </div>
  );
}
