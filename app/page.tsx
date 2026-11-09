import { Inter } from "next/font/google";
import { supabase, currentUser } from "@/lib/supabase";
import HomeClient from "./HomeClient";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default async function Home() {
  const { user, role } = await currentUser();
  const db = await supabase();
  const [{ data: categories }, { data: vendors }] = await Promise.all([
    db.from("categories").select("id, name_en").order("id"),
    // shortcut: the homepage filters the top 60 approved vendors in the browser; "See all" goes to /vendors for the full, paged list.
    db.from("vendor_cards").select("id, business_name, category_id, city, photos, verified, rating, review_count")
      .eq("status", "approved")
      .order("verified", { ascending: false })
      .order("rating", { ascending: false })
      .order("review_count", { ascending: false })
      .limit(60),
  ]);
  return (
    <div lang="en" dir="ltr" className={inter.variable}>
      <HomeClient categories={categories ?? []} vendors={vendors ?? []} signedIn={!!user} role={role} />
    </div>
  );
}
