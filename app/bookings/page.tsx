import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/supabase";
import { BOOKING_STATUS } from "@/lib/constants";
import { setBookingStatus } from "../requests/actions";

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { error } = await searchParams;
  const { db, user } = await currentUser();
  if (!user) redirect("/login?next=/bookings");
  // RLS returns bookings where the user is the customer or owns the supplier listing.
  const { data: bookings } = await db.from("bookings").select("id, customer_id, price, terms, event_date, status, vendors(id, business_name, owner_id)").order("event_date", { ascending: false });
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
  const button = (bookingId: string, status: string, label: string, primary = false) => (
    <form action={setBookingStatus}>
      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="status" value={status} />
      <button className={primary ? "btn" : "rounded-lg border px-4 py-2"}>{label}</button>
    </form>
  );

  return (
    <div className="grid gap-3">
      <h1 className="text-xl font-bold">الحجوزات</h1>
      {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      {!bookings?.length && <p className="text-stone-600">لا توجد حجوزات بعد. تظهر هنا عند قبول عرض سعر.</p>}
      {bookings?.map((b) => {
        const v = b.vendors as unknown as { id: string; business_name: string; owner_id: string };
        const isVendor = v.owner_id === user.id;
        return (
          <div key={b.id} className="card grid gap-2">
            <div className="flex flex-wrap justify-between gap-2">
              <Link href={`/vendors/${v.id}`} className="font-bold underline">{v.business_name}</Link>
              <span>{BOOKING_STATUS[b.status]}</span>
            </div>
            <p className="text-sm text-stone-600">{b.event_date} · {b.price.toLocaleString("ar-SA")} ريال · الدفع مباشرة للمزود خارج المنصة</p>
            <p className="whitespace-pre-line text-sm">{b.terms}</p>
            <div className="flex flex-wrap gap-2">
              {isVendor && b.status === "requested" && button(b.id, "confirmed", "تأكيد الحجز", true)}
              {b.status === "confirmed" && b.event_date <= today && button(b.id, "completed", "تمت المناسبة", true)}
              {(b.status === "requested" || b.status === "confirmed") && button(b.id, "cancelled", isVendor && b.status === "requested" ? "اعتذار" : "إلغاء الحجز")}
              {!isVendor && b.status === "completed" && <Link href={`/vendors/${v.id}#review`} className="btn">قيّم المزود</Link>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
