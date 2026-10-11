"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/supabase";

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
  if (error) redirect(`/vendors/${vendorId}?error=${encodeURIComponent("لا يمكنك تقييم هذا المزود (قد تكون قيّمته من قبل)")}`);
  revalidatePath(`/vendors/${vendorId}`);
}
