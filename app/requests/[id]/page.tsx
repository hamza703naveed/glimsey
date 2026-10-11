import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/supabase";
import { waLink } from "@/lib/whatsapp";
import { isOpen } from "@/lib/constants";
import { closeRequest, submitBid } from "../actions";

export default async function RequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const { db, user, role } = await currentUser();
  if (!user) redirect(`/login?next=/requests/${id}`);
  const { data: r } = await db.from("requests").select("*").eq("id", id).maybeSingle();
  if (!r) notFound();
  const isOwner = r.customer_id === user.id;
  const open = isOpen(r);
  if (isOwner) await db.rpc("mark_bids_seen", { req: id });

  // RLS: the owner sees every bid, a vendor sees only their own.
  const { data: bids } = await db.from("bids").select("id, price, message, seen_at, created_at, vendors(id, business_name, whatsapp, verified)").eq("request_id", id).order("created_at");
  const { data: categories } = await db.from("categories").select("name_ar").in("id", r.category_ids);

  return (
    <div className="grid gap-6">
      <div className="card grid gap-2">
        <h1 className="text-xl font-bold">{r.event_type} · {r.city}</h1>
        <p className="text-stone-600">
          {categories?.map((c) => c.name_ar).join("، ")}
          {r.event_date && ` · ${r.event_date}`}
          {r.guest_count && ` · ${r.guest_count} ضيف`}
          {(r.budget_min != null || r.budget_max != null) && ` · الميزانية ${r.budget_min ?? "؟"} - ${r.budget_max ?? "؟"} ريال`}
        </p>
        <p className="whitespace-pre-line">{r.description}</p>
        <p className="text-sm">{open ? `مفتوح حتى ${new Date(r.expires_at).toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" })}` : "مغلق"}</p>
        {(isOwner || role === "admin") && open && (
          <form action={closeRequest}><input type="hidden" name="request_id" value={id} /><button className="text-sm text-stone-600 underline">إغلاق الطلب</button></form>
        )}
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}

      <section className="grid gap-3">
        <h2 className="text-lg font-bold">{isOwner ? `العروض (${bids?.length ?? 0})` : "عرضك"}</h2>
        {/* A bid whose vendor is no longer approved comes back without its vendor; hide it. */}
        {bids?.filter((b) => b.vendors).map((b) => {
          const v = b.vendors as unknown as { id: string; business_name: string; whatsapp: string; verified: boolean };
          return (
            <div key={b.id} className="card grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/vendors/${v.id}`} className="font-bold underline">{v.business_name}{v.verified && " ✓"}</Link>
                <span className="font-bold">{b.price.toLocaleString("ar-SA")} ريال</span>
              </div>
              <p className="whitespace-pre-line">{b.message}</p>
              {isOwner ? (
                <a className="btn w-fit bg-emerald-600 hover:bg-emerald-700" href={waLink(v.whatsapp, `مرحباً، بخصوص عرضكم على طلبي في منصة حفلات (${r.event_type})`)} target="_blank" rel="noopener noreferrer">تواصل عبر واتساب</a>
              ) : (
                <span className="text-sm text-stone-600">{b.seen_at ? "شاهد العميل عرضك" : "لم يُشاهَد بعد"}</span>
              )}
            </div>
          );
        })}
        {isOwner && !bids?.length && <p className="text-stone-600">لم تصلك عروض بعد. سنُعلم المزودين في الفئات المطلوبة.</p>}
        {!isOwner && !bids?.length && open && (
          <form action={submitBid} className="card grid gap-2">
            <input type="hidden" name="request_id" value={id} />
            <label>السعر المقترح (ريال)<input className="input" type="number" name="price" min={0} required /></label>
            <label>رسالتك للعميل<textarea className="input" name="message" rows={4} minLength={5} maxLength={2000} required /></label>
            <button className="btn w-fit">إرسال العرض</button>
          </form>
        )}
      </section>
    </div>
  );
}
