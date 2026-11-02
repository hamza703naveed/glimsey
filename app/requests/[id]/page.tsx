import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/supabase";
import { waLink } from "@/lib/whatsapp";
import { BOOKING_STATUS, isOpen } from "@/lib/constants";
import { acceptBid, closeRequest, reviseBid, submitBid } from "../actions";

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
  const { data: bids } = await db.from("bids").select("id, price, message, includes, valid_until, seen_at, created_at, vendors(id, business_name, whatsapp, verified), bookings(status)").eq("request_id", id).order("created_at");
  const { data: categories } = await db.from("categories").select("name_ar").in("id", r.category_ids);
  const { data: target } = r.vendor_id ? await db.from("vendors").select("business_name").eq("id", r.vendor_id).maybeSingle() : { data: null };
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
  const week = new Date();
  week.setDate(week.getDate() + 7);
  const inAWeek = week.toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
  const quoteInputs = (b?: { price: number; message: string; includes: string | null; valid_until: string }) => (
    <>
      <input type="hidden" name="request_id" value={id} />
      <label>السعر (ريال)<input className="input" type="number" name="price" min={0} required defaultValue={b?.price} /></label>
      <label>رسالتك للعميل<textarea className="input" name="message" rows={3} minLength={5} maxLength={2000} required defaultValue={b?.message} /></label>
      <label>ماذا يشمل العرض<textarea className="input" name="includes" rows={3} maxLength={2000} defaultValue={b?.includes ?? ""} placeholder="مثال: 6 ساعات تصوير، 300 صورة معدلة، ألبوم" /></label>
      <label>العرض صالح حتى<input className="input" type="date" name="valid_until" min={today} required defaultValue={b && b.valid_until >= today ? b.valid_until : inAWeek} /></label>
    </>
  );

  return (
    <div className="grid gap-6">
      <div className="card grid gap-2">
        <h1 className="text-xl font-bold">{r.event_type} · {r.city}</h1>
        {target && <p className="text-sm text-rose-700">طلب مباشر إلى {target.business_name}</p>}
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
          const booking = (b.bookings as { status: string }[]).find((x) => x.status !== "cancelled");
          const valid = b.valid_until >= today;
          return (
            <div key={b.id} className="card grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/vendors/${v.id}`} className="font-bold underline">{v.business_name}{v.verified && " ✓"}</Link>
                <span className="font-bold">{b.price.toLocaleString("ar-SA")} ريال</span>
              </div>
              <p className="whitespace-pre-line">{b.message}</p>
              {b.includes && <p className="whitespace-pre-line text-sm"><b>يشمل:</b> {b.includes}</p>}
              <p className="text-sm text-stone-600">{valid ? `صالح حتى ${b.valid_until}` : "انتهت صلاحية العرض"}{booking && ` · الحجز: ${BOOKING_STATUS[booking.status]}`}</p>
              {isOwner ? (
                <div className="flex flex-wrap gap-2">
                  {!booking && valid && (
                    <form action={acceptBid}><input type="hidden" name="request_id" value={id} /><input type="hidden" name="bid_id" value={b.id} /><button className="btn">قبول العرض وطلب الحجز</button></form>
                  )}
                  <a className="rounded-lg border px-4 py-2" href={waLink(v.whatsapp, `مرحباً، بخصوص عرضكم على طلبي في منصة Glimsey (${r.event_type})`)} target="_blank" rel="noopener noreferrer">تواصل أو اطلب تعديلاً عبر واتساب</a>
                </div>
              ) : (
                <>
                  <span className="text-sm text-stone-600">{b.seen_at ? "شاهد العميل عرضك" : "لم يُشاهَد بعد"}</span>
                  {open && !booking && (
                    <details><summary className="cursor-pointer text-sm underline">تعديل العرض</summary>
                      <form action={reviseBid} className="mt-2 grid gap-2"><input type="hidden" name="bid_id" value={b.id} />{quoteInputs(b)}<button className="btn w-fit">حفظ التعديل</button></form>
                    </details>
                  )}
                </>
              )}
            </div>
          );
        })}
        {isOwner && !bids?.length && <p className="text-stone-600">لم تصلك عروض بعد. سنُعلم المزودين في الفئات المطلوبة.</p>}
        {!isOwner && !bids?.length && open && (
          <form action={submitBid} className="card grid gap-2">
            {quoteInputs()}
            <button className="btn w-fit">إرسال العرض</button>
          </form>
        )}
      </section>
    </div>
  );
}
