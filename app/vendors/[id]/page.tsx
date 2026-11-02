import { notFound } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/supabase";
import { PRICE_TIERS } from "@/lib/constants";
import { waLink } from "@/lib/whatsapp";
import { addReview, deleteReview, replyReview, reportReview } from "./actions";

export default async function VendorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const { db, user, role } = await currentUser();
  const { data: v } = await db.from("vendor_cards").select("*").eq("id", id).maybeSingle();
  if (!v) notFound();
  const { data: category } = await db.from("categories").select("name_ar").eq("id", v.category_id).single();
  const { data: reviews } = await db.from("reviews").select("id, customer_id, rating, body, vendor_reply, reported_at, created_at").eq("vendor_id", id).order("created_at", { ascending: false });

  const isOwner = user?.id === v.owner_id;
  // Reviews open after a completed booking (the database enforces this too).
  const { data: completed } = role === "customer" ? await db.from("bookings").select("id").eq("vendor_id", id).eq("status", "completed").limit(1) : { data: null };
  const canReview = !!completed?.length && !reviews?.some((r) => r.customer_id === user?.id);

  return (
    <div className="grid gap-6">
      {v.status !== "approved" && <p className="rounded-lg bg-amber-50 p-3 text-amber-800">هذا الملف بانتظار مراجعة الإدارة ولا يظهر للعملاء بعد.</p>}
      <div className="grid gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          {v.business_name}
          {v.verified && <span className="rounded bg-emerald-100 px-2 text-sm text-emerald-800">موثّق</span>}
        </h1>
        <p className="text-stone-600">{category?.name_ar} · {v.city} · {PRICE_TIERS[v.price_tier]} · {v.review_count ? `★ ${v.rating} (${v.review_count})` : "لا توجد تقييمات بعد"}</p>
        <a className="btn w-fit bg-emerald-600 hover:bg-emerald-700" href={waLink(v.whatsapp, `مرحباً ${v.business_name}، وجدتكم عبر منصة Glimsey`)} target="_blank" rel="noopener noreferrer">
          تواصل عبر واتساب
        </a>
        {!isOwner && role !== "vendor" && <Link href={`/requests/new?vendor=${v.id}`} className="btn w-fit">اطلب عرض سعر</Link>}
      </div>
      {v.photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {v.photos.map((p: string) => <img key={p} src={p} alt="" className="aspect-square w-full rounded-lg object-cover" />)}
        </div>
      )}
      {v.description && <p className="card whitespace-pre-line">{v.description}</p>}

      <section className="grid gap-3">
        <h2 className="text-lg font-bold">التقييمات</h2>
        {reviews?.map((r) => (
          <div key={r.id} className="card">
            <div>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
            {r.body && <p className="mt-1 whitespace-pre-line">{r.body}</p>}
            {r.vendor_reply && <p className="mt-2 whitespace-pre-line border-r-2 border-stone-300 pr-3 text-sm"><b>رد المزود:</b> {r.vendor_reply}</p>}
            {isOwner && !r.vendor_reply && (
              <form action={replyReview} className="mt-2 flex gap-2">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="vendor_id" value={v.id} />
                <input name="reply" className="input flex-1" maxLength={1500} required placeholder="ردك العلني (مرة واحدة)" aria-label="ردك على التقييم" />
                <button className="btn">رد</button>
              </form>
            )}
            {user && !r.reported_at && (
              <form action={reportReview}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="vendor_id" value={v.id} />
                <button className="text-sm text-stone-500 underline">إبلاغ</button>
              </form>
            )}
            {role === "admin" && (
              <form action={deleteReview}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="vendor_id" value={v.id} />
                <button className="text-sm text-red-700 underline">حذف التقييم</button>
              </form>
            )}
          </div>
        ))}
        {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
        {canReview ? (
          <form action={addReview} id="review" className="card grid gap-2">
            <input type="hidden" name="vendor_id" value={v.id} />
            <label>تقييمك
              <select name="rating" className="input" required defaultValue="5">
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
              </select>
            </label>
            <label>تعليقك (اختياري)<textarea name="body" className="input" maxLength={1500} rows={3} /></label>
            <button className="btn w-fit">إرسال التقييم</button>
          </form>
        ) : role === "customer" ? (
          <p className="text-sm text-stone-600">يمكن التقييم بعد حجز مكتمل مع هذا المزود.</p>
        ) : !user && (
          <p><Link href={`/login?next=/vendors/${v.id}`} className="text-rose-700 underline">سجّل الدخول</Link> لكتابة تقييم.</p>
        )}
      </section>
    </div>
  );
}
