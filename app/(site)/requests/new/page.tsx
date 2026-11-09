import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase";
import { CITIES, EVENT_TYPES } from "@/lib/constants";
import { postRequest } from "../actions";

export default async function NewRequestPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { error } = await searchParams;
  const { db, user } = await currentUser();
  if (!user) redirect("/login?next=/requests/new");
  const { data: categories } = await db.from("categories").select("id, name_ar").order("id");

  return (
    <form action={postRequest} className="card mx-auto grid max-w-2xl gap-3">
      <h1 className="text-xl font-bold">صف مناسبتك وسيرسل لك المزودون عروضهم</h1>
      {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      <label>نوع المناسبة
        <select className="input" name="event_type">{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
      </label>
      <fieldset className="grid gap-1">
        <legend>الخدمات المطلوبة</legend>
        <div className="grid grid-cols-2 gap-1 md:grid-cols-3">
          {categories?.map((c) => <label key={c.id}><input type="checkbox" name="category_ids" value={c.id} /> {c.name_ar}</label>)}
        </div>
      </fieldset>
      <label>المدينة
        <select className="input" name="city">{CITIES.map((c) => <option key={c}>{c}</option>)}</select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label>تاريخ المناسبة<input className="input" type="date" name="event_date" /></label>
        <label>عدد الضيوف<input className="input" type="number" name="guest_count" min={1} /></label>
        <label>الميزانية من (ريال)<input className="input" type="number" name="budget_min" min={0} /></label>
        <label>إلى (ريال)<input className="input" type="number" name="budget_max" min={0} /></label>
      </div>
      <label>التفاصيل<textarea className="input" name="description" rows={5} minLength={10} maxLength={3000} required placeholder="مثال: حفل خطوبة في المنزل لـ 80 ضيفة، نحتاج تنسيق ورد وطاولة حلويات" /></label>
      <button className="btn">نشر الطلب</button>
    </form>
  );
}
