"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/supabase";

export async function deleteReview(form: FormData) {
  const { db } = await currentUser();
  await db.from("reviews").delete().eq("id", String(form.get("id"))); // RLS: admins only
  revalidatePath(`/vendors/${form.get("vendor_id")}`);
}

export async function addReview(form: FormData) {
  const { db, user } = await currentUser();
  const vendorId = String(form.get("vendor_id"));
  if (!user) redirect(`/login?next=/vendors/${vendorId}`);
  const { error } = await db.from("reviews").insert({
    vendor_id: vendorId,
    customer_id: user.id,
    rating: Number(form.get("rating")),
    body: String(form.get("body") ?? "").trim() || null,
  });
  if (error) redirect(`/vendors/${vendorId}?error=${encodeURIComponent("يمكنك التقييم مرة واحدة بعد حجز مكتمل مع هذا المزود")}`);
  revalidatePath(`/vendors/${vendorId}`);
}

export async function replyReview(form: FormData) {
  const { db } = await currentUser();
  await db.rpc("reply_review", { review: String(form.get("id")), reply: String(form.get("reply")).trim() }); // owner of the listing, once
  revalidatePath(`/vendors/${form.get("vendor_id")}`);
}

export async function reportReview(form: FormData) {
  const { db, user } = await currentUser();
  if (!user) redirect(`/login?next=/vendors/${form.get("vendor_id")}`);
  await db.rpc("report_review", { review: String(form.get("id")) });
  revalidatePath(`/vendors/${form.get("vendor_id")}`);
  revalidatePath("/admin");
}
