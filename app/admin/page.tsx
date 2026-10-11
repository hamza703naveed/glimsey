import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/supabase";
import { setVendorStatus } from "./actions";

export default async function AdminPage() {
  const { db, role } = await currentUser();
  if (role !== "admin") redirect("/");
  const { data: vendors } = await db.from("vendors").select("id, business_name, city, whatsapp, status, verified, created_at").neq("status", "approved").order("created_at");

  return (
    <div className="grid gap-3">
      <h1 className="text-xl font-bold">مزودون بانتظار المراجعة ({vendors?.length ?? 0})</h1>
      {vendors?.map((v) => (
        <form key={v.id} action={setVendorStatus} className="card flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={v.id} />
          <Link href={`/vendors/${v.id}`} className="flex-1 font-semibold underline">{v.business_name} · {v.city} · {v.whatsapp}</Link>
          {v.status === "rejected" && <span className="text-sm text-red-700">مرفوض</span>}
          <label className="text-sm"><input type="checkbox" name="verified" /> شهادة العمل الحر موثّقة</label>
          <button name="status" value="approved" className="btn">اعتماد</button>
          <button name="status" value="rejected" className="rounded-lg border px-4 py-2">رفض</button>
        </form>
      ))}
    </div>
  );
}
