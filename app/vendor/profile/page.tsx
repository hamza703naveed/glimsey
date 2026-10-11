import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/supabase";
import { CITIES, PRICE_TIERS } from "@/lib/constants";
import { saveVendor } from "./actions";

const STATUS: Record<string, string> = { pending: "بانتظار المراجعة", approved: "منشور", rejected: "مرفوض، تواصل معنا" };

export default async function VendorProfilePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { error, saved } = await searchParams;
  const { db, user, role } = await currentUser();
  if (!user) redirect("/login?next=/vendor/profile");
  if (role !== "vendor") redirect("/");
  const { data: v } = await db.from("vendors").select("*").eq("owner_id", user.id).maybeSingle();
  const { data: categories } = await db.from("categories").select("id, name_ar").order("id");

  return (
    <form action={saveVendor} className="card mx-auto grid max-w-2xl gap-3">
      <h1 className="text-xl font-bold">ملفك التجاري</h1>
      {v && <p>الحالة: <b>{STATUS[v.status]}</b> · <Link href={`/vendors/${v.id}`} className="text-rose-700 underline">عرض الملف</Link></p>}
      {saved && <p className="rounded-lg bg-green-50 p-3 text-green-700">تم الحفظ.{v?.status === "pending" && " سنراجع ملفك قريباً."}</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      <label>اسم النشاط<input className="input" name="business_name" defaultValue={v?.business_name} required minLength={2} maxLength={120} /></label>
      <label>الفئة
        <select className="input" name="category_id" defaultValue={v?.category_id} required>
          {categories?.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
        </select>
      </label>
      <label>المدينة
        <select className="input" name="city" defaultValue={v?.city ?? CITIES[0]}>
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label>الفئة السعرية
        <select className="input" name="price_tier" defaultValue={v?.price_tier ?? "mid"}>
          {Object.entries(PRICE_TIERS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </label>
      <label>رقم واتساب<input className="input" name="whatsapp" dir="ltr" placeholder="05XXXXXXXX" defaultValue={v ? `0${v.whatsapp.slice(3)}` : ""} required /></label>
      <label>نبذة عن خدماتك وأسعارك<textarea className="input" name="description" rows={5} maxLength={3000} defaultValue={v?.description ?? ""} /></label>
      {v?.photos?.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {v.photos.map((p: string) => (
            <label key={p} className="grid gap-1 text-sm">
              <img src={p} alt="" className="aspect-square w-full rounded-lg object-cover" />
              <span><input type="checkbox" name="remove_photo" value={p} /> حذف</span>
            </label>
          ))}
        </div>
      )}
      <label>إضافة صور لأعمالك (حتى 10 صور)<input className="input" name="photos" type="file" accept="image/*" multiple /></label>
      <button className="btn">حفظ</button>
    </form>
  );
}
