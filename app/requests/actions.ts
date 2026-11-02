"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/supabase";
import { CITIES, EVENT_TYPES } from "@/lib/constants";

const num = (v: FormDataEntryValue | null) => (v ? Number(v) : null);

export async function postRequest(form: FormData) {
  const { db, user } = await currentUser();
  if (!user) redirect("/login?next=/requests/new");
  const back = form.get("vendor_id") ? `vendor=${form.get("vendor_id")}&` : "";
  const fail = (msg: string): never => redirect(`/requests/new?${back}error=${encodeURIComponent(msg)}`);

  // An inquiry to one supplier is a request addressed to them, in their category.
  const vendorId = String(form.get("vendor_id") || "") || null;
  const { data: vendor } = vendorId ? await db.from("vendors").select("id, category_id").eq("id", vendorId).eq("status", "approved").maybeSingle() : { data: null };
  if (vendorId && !vendor) fail("المزود غير متاح");
  const categoryIds = vendor ? [vendor.category_id] : form.getAll("category_ids").map(Number);
  if (!categoryIds.length) fail("اختر خدمة واحدة على الأقل");
  const eventDate = String(form.get("event_date") || "");
  if (!eventDate) fail("حدد تاريخ المناسبة");
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
    event_date: eventDate,
    vendor_id: vendor?.id ?? null,
    guest_count: num(form.get("guest_count")),
    budget_min: budgetMin,
    budget_max: budgetMax,
    description: String(form.get("description")).trim(),
  }).select("id").single();
  // 42501 = the database's "at most 5 open requests" rule
  if (error?.code === "42501") fail("لديك 5 طلبات مفتوحة. أغلق طلباً قديماً قبل نشر طلب جديد");
  if (error) fail("تعذر نشر الطلب، تأكد من البيانات");
  redirect(`/requests/${data!.id}`);
}

export async function submitBid(form: FormData) {
  const { db, user } = await currentUser();
  const requestId = String(form.get("request_id"));
  if (!user) redirect(`/login?next=/requests/${requestId}`);
  const { data: vendor } = await db.from("vendors").select("id").eq("owner_id", user.id).eq("status", "approved").maybeSingle();
  const { error } = vendor
    ? await db.from("bids").insert({ request_id: requestId, vendor_id: vendor.id, ...quoteFields(form) })
    : { error: true };
  if (error) redirect(`/requests/${requestId}?error=${encodeURIComponent("تعذر إرسال العرض (ربما أرسلت عرضاً من قبل أو أُغلق الطلب)")}`);
  revalidatePath(`/requests/${requestId}`);
}

const quoteFields = (form: FormData) => ({
  price: Number(form.get("price")),
  message: String(form.get("message")).trim(),
  includes: String(form.get("includes") ?? "").trim() || null,
  valid_until: String(form.get("valid_until")),
});

export async function reviseBid(form: FormData) {
  const { db } = await currentUser();
  const requestId = String(form.get("request_id"));
  const q = quoteFields(form);
  const { error } = await db.rpc("revise_bid", { bid: String(form.get("bid_id")), new_price: q.price, new_message: q.message, new_includes: q.includes, new_valid_until: q.valid_until });
  if (error) redirect(`/requests/${requestId}?error=${encodeURIComponent("تعذر تعديل العرض (ربما أُغلق الطلب)")}`);
  revalidatePath(`/requests/${requestId}`);
}

// The customer accepts a quote; the booking then waits for the supplier to confirm.
export async function acceptBid(form: FormData) {
  const { db } = await currentUser();
  const requestId = String(form.get("request_id"));
  const { error } = await db.rpc("accept_bid", { bid: String(form.get("bid_id")) });
  if (error) redirect(`/requests/${requestId}?error=${encodeURIComponent(error.code === "P0001" ? "انتهت صلاحية هذا العرض، اطلب من المزود تحديثه" : "تعذر قبول العرض (ربما قبلته من قبل)")}`);
  redirect("/bookings");
}

export async function setBookingStatus(form: FormData) {
  const { db } = await currentUser();
  const { error } = await db.rpc("set_booking_status", { booking: String(form.get("booking_id")), new_status: String(form.get("status")) });
  if (error) redirect(`/bookings?error=${encodeURIComponent("تعذر تحديث الحجز")}`);
  revalidatePath("/bookings");
}

// The database function only closes the caller's own request (or any request, for admins).
export async function closeRequest(form: FormData) {
  const { db } = await currentUser();
  const requestId = String(form.get("request_id"));
  await db.rpc("close_request", { req: requestId });
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/admin");
}
