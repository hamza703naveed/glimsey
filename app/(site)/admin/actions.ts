"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/supabase";

export async function setVendorStatus(form: FormData) {
  const { db, role } = await currentUser();
  if (role !== "admin") return; // RLS and the vendors_guard trigger enforce this too
  const status = form.get("status") === "approved" ? "approved" : "rejected";
  await db.from("vendors").update({ status, verified: form.get("verified") === "on" }).eq("id", String(form.get("id")));
  revalidatePath("/admin");
}
