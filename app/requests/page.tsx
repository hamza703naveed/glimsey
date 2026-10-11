import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/supabase";
import { isOpen } from "@/lib/constants";

export default async function RequestsPage() {
  const { db, user, role } = await currentUser();
  if (!user) redirect("/login?next=/requests");
  // RLS returns the customer's own requests, plus open requests in the category of an approved vendor.
  const { data: requests } = await db.from("requests").select("id, customer_id, event_type, city, event_date, status, expires_at, created_at, bids(count)").order("created_at", { ascending: false });
  const mine = requests?.filter((r) => r.customer_id === user.id) ?? [];
  const open = requests?.filter((r) => r.customer_id !== user.id) ?? [];

  // A vendor only sees their own bid, so for them the count means "did I bid".
  const list = (rows: typeof mine, forVendor: boolean) => rows.map((r) => (
    <Link key={r.id} href={`/requests/${r.id}`} className="card flex flex-wrap justify-between gap-2 hover:border-rose-300">
      <span className="font-semibold">{r.event_type} · {r.city}{r.event_date && ` · ${r.event_date}`}</span>
      <span className="text-sm text-stone-600">{isOpen(r) ? "مفتوح" : "مغلق"} · {forVendor ? (r.bids[0]?.count ? "أرسلت عرضاً" : "لم ترسل عرضاً") : `${r.bids[0]?.count ?? 0} عروض`}</span>
    </Link>
  ));

  return (
    <div className="grid gap-8">
      {role === "vendor" && (
        <section className="grid gap-3">
          <h1 className="text-xl font-bold">طلبات في فئتك</h1>
          {open.length ? list(open, true) : <p className="text-stone-600">لا توجد طلبات حالياً. تظهر الطلبات هنا بعد اعتماد ملفك التجاري.</p>}
        </section>
      )}
      <section className="grid gap-3">
        <h2 className="text-xl font-bold">طلباتي</h2>
        {mine.length ? list(mine, false) : <p className="text-stone-600">لم تنشر أي طلب بعد. <Link href="/requests/new" className="text-rose-700 underline">انشر طلباً</Link></p>}
      </section>
    </div>
  );
}
