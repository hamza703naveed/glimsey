"use server";

import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase";
import { CITIES, PRICE_TIERS } from "@/lib/constants";
import { normaliseSaudiMobile } from "@/lib/whatsapp";

const MAX_PHOTOS = 10;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"]; // same list as the storage bucket in schema.sql
const fail = (msg: string): never => redirect(`/vendor/profile?error=${encodeURIComponent(msg)}`);

export async function saveVendor(form: FormData) {
  const { db, user, role } = await currentUser();
  if (!user || role !== "vendor") redirect("/login?next=/vendor/profile");

  const whatsapp = normaliseSaudiMobile(String(form.get("whatsapp")));
  if (!whatsapp) fail("رقم الواتساب يجب أن يكون رقم جوال سعودي مثل 05XXXXXXXX");
  const city = String(form.get("city"));
  const tier = String(form.get("price_tier"));
  if (!CITIES.includes(city) || !(tier in PRICE_TIERS)) fail("بيانات غير صحيحة");

  const { data: existing } = await db.from("vendors").select("id, photos").eq("owner_id", user.id).maybeSingle();
  const removed = new Set(form.getAll("remove_photo").map(String));
  const photos: string[] = (existing?.photos ?? []).filter((p: string) => !removed.has(p));

  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length + files.length > MAX_PHOTOS) fail(`الحد الأقصى ${MAX_PHOTOS} صور`);
  for (const file of files) {
    if (!PHOTO_TYPES.includes(file.type) || file.size > 5_242_880) fail("الصور المقبولة: JPG أو PNG أو WebP، وأقل من 5 ميغابايت لكل صورة");
    const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "")}`;
    const { error } = await db.storage.from("vendor-photos").upload(path, file, { contentType: file.type });
    if (error) fail("تعذر رفع الصور، حاول مرة أخرى");
    photos.push(db.storage.from("vendor-photos").getPublicUrl(path).data.publicUrl);
  }

  const fields = {
    business_name: String(form.get("business_name")).trim(),
    category_id: Number(form.get("category_id")),
    city,
    price_tier: tier,
    whatsapp,
    description: String(form.get("description") ?? "").trim() || null,
    photos,
  };
  const { error } = existing
    ? await db.from("vendors").update(fields).eq("id", existing.id)
    : await db.from("vendors").insert({ ...fields, owner_id: user.id });
  if (error) fail("تعذر الحفظ، تأكد من البيانات");
  // shortcut: removed photos stay in storage; clean them up with a scheduled job if storage cost matters.
  redirect("/vendor/profile?saved=1");
}
