import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CITIES, PRICE_TIERS } from "@/lib/constants";

export default async function VendorsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { category, city, tier, q } = await searchParams;
  const db = await supabase();
  const { data: categories } = await db.from("categories").select("id, name_ar").order("id");

  let query = db.from("vendor_cards").select("*").eq("status", "approved");
  if (category) query = query.eq("category_id", Number(category));
  if (city) query = query.eq("city", city);
  if (tier) query = query.eq("price_tier", tier);
  if (q) query = query.ilike("business_name", `%${q.replace(/[%_]/g, "")}%`);
  // shortcut: simple "best match" order (verified, then rating, then review count); move to a weighted score once there are reviews to tune it on.
  const { data: vendors } = await query
    .order("verified", { ascending: false })
    .order("rating", { ascending: false })
    .order("review_count", { ascending: false })
    .limit(60);

  return (
    <div className="grid gap-6">
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="ابحث بالاسم" className="input flex-1" aria-label="ابحث بالاسم" />
        <select name="category" defaultValue={category} className="input w-auto" aria-label="الفئة">
          <option value="">كل الفئات</option>
          {categories?.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
        </select>
        <select name="city" defaultValue={city} className="input w-auto" aria-label="المدينة">
          <option value="">كل المدن</option>
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select name="tier" defaultValue={tier} className="input w-auto" aria-label="الفئة السعرية">
          <option value="">كل الأسعار</option>
          {Object.entries(PRICE_TIERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn">تطبيق</button>
      </form>
      {!vendors?.length && <p className="card text-center text-stone-600">لا يوجد مزودون مطابقون بعد. جرّب توسيع البحث أو <Link href="/requests/new" className="text-rose-700 underline">انشر طلبك</Link> ليصلك المزودون.</p>}
      <div className="grid gap-4 md:grid-cols-3">
        {vendors?.map((v) => (
          <Link key={v.id} href={`/vendors/${v.id}`} className="card grid gap-2 hover:border-rose-300">
            {v.photos[0] && <img src={v.photos[0]} alt="" className="aspect-video w-full rounded-lg object-cover" />}
            <div className="flex items-center gap-2 font-bold">
              {v.business_name}
              {v.verified && <span className="rounded bg-emerald-100 px-1.5 text-xs text-emerald-800">موثّق</span>}
            </div>
            <div className="text-sm text-stone-600">{v.city} · {PRICE_TIERS[v.price_tier]}</div>
            <div className="text-sm">{v.review_count ? `★ ${v.rating} (${v.review_count})` : "لا توجد تقييمات بعد"}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
