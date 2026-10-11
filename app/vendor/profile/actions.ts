"use server";

import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase";
import { CITIES, PRICE_TIERS } from "@/lib/constants";
import { normaliseSaudiMobile } from "@/lib/whatsapp";

const MAX_PHOTOS = 10;
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

  // Photos were uploaded by the browser (PhotoUploader); accept only links into this vendor's own folder.
  const ownFolder = db.storage.from("vendor-photos").getPublicUrl(`${user.id}/`).data.publicUrl;
  const added = form.getAll("new_photo").map(String);
  if (added.some((u) => !u.startsWith(ownFolder) || u.slice(ownFolder.length).includes("/"))) fail("رابط صورة غير صالح");
  photos.push(...added);
  if (photos.length > MAX_PHOTOS) fail(`الحد الأقصى ${MAX_PHOTOS} صور`);

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
