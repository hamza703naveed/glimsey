import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/supabase";
import { setVendorStatus } from "./actions";

const STATUS: Record<string, string> = { pending: "بانتظار المراجعة", approved: "منشور", rejected: "مرفوض" };

export default async function AdminPage() {
  const { db, role } = await currentUser();
  if (role !== "admin") redirect("/");
  const { data: vendors } = await db.from("vendors").select("id, business_name, city, whatsapp, status, verified, created_at").order("created_at", { ascending: false });
  // shortcut: one unpaged list of every vendor, pending first; add search and paging past a few thousand vendors.
  vendors?.sort((a, b) => Number(a.status !== "pending") - Number(b.status !== "pending"));

  return (
    <div className="grid gap-3">
      <h1 className="text-xl font-bold">المزودون ({vendors?.filter((v) => v.status === "pending").length ?? 0} بانتظار المراجعة)</h1>
      {vendors?.map((v) => (
        <form key={v.id} action={setVendorStatus} className="card flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={v.id} />
          <Link href={`/vendors/${v.id}`} className="flex-1 font-semibold underline">{v.business_name} · {v.city} · {v.whatsapp}</Link>
          <span className="text-sm">{STATUS[v.status]}</span>
          <label className="text-sm"><input type="checkbox" name="verified" defaultChecked={v.verified} /> شهادة العمل الحر موثّقة</label>
          <button name="status" value="approved" className="btn">اعتماد / نشر</button>
          <button name="status" value="rejected" className="rounded-lg border px-4 py-2">رفض / إخفاء</button>
        </form>
      ))}
    </div>
  );
}
