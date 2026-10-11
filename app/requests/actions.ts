"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/supabase";
import { CITIES, EVENT_TYPES } from "@/lib/constants";

const num = (v: FormDataEntryValue | null) => (v ? Number(v) : null);

export async function postRequest(form: FormData) {
  const { db, user } = await currentUser();
  if (!user) redirect("/login?next=/requests/new");
  const fail = (msg: string): never => redirect(`/requests/new?error=${encodeURIComponent(msg)}`);

  const categoryIds = form.getAll("category_ids").map(Number);
  if (!categoryIds.length) fail("اختر خدمة واحدة على الأقل");
  const city = String(form.get("city"));
  const eventType = String(form.get("event_type"));
  if (!CITIES.includes(city) || !EVENT_TYPES.includes(eventType)) fail("بيانات غير صحيحة");
  const budgetMin = num(form.get("budget_min"));
  const budgetMax = num(form.get("budget_max"));
  if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) fail("الحد الأدنى للميزانية أكبر من الحد الأعلى");

  const { data, error } = await db.from("requests").insert({
    customer_id: user.id,
    category_ids: categoryIds,
    event_type: eventType,
    city,
    event_date: String(form.get("event_date") || "") || null,
    guest_count: num(form.get("guest_count")),
    budget_min: budgetMin,
    budget_max: budgetMax,
    description: String(form.get("description")).trim(),
  }).select("id").single();
  if (error) fail("تعذر نشر الطلب، تأكد من البيانات");
  redirect(`/requests/${data!.id}`);
}

export async function submitBid(form: FormData) {
  const { db, user } = await currentUser();
  const requestId = String(form.get("request_id"));
  if (!user) redirect(`/login?next=/requests/${requestId}`);
  const { data: vendor } = await db.from("vendors").select("id").eq("owner_id", user.id).eq("status", "approved").maybeSingle();
  const { error } = vendor
    ? await db.from("bids").insert({ request_id: requestId, vendor_id: vendor.id, price: Number(form.get("price")), message: String(form.get("message")).trim() })
    : { error: true };
  if (error) redirect(`/requests/${requestId}?error=${encodeURIComponent("تعذر إرسال العرض (ربما أرسلت عرضاً من قبل أو أُغلق الطلب)")}`);
  revalidatePath(`/requests/${requestId}`);
}

export async function closeRequest(form: FormData) {
  const { db } = await currentUser();
  const requestId = String(form.get("request_id"));
  await db.from("requests").update({ status: "closed" }).eq("id", requestId);
  revalidatePath(`/requests/${requestId}`);
}
