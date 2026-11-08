import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { safePath } from "@/lib/constants";

// Finishes the login from an email link (sign-up confirmation or password reset).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const db = await supabase();
  const { error } = code ? await db.auth.exchangeCodeForSession(code) : { error: true };
  if (error) return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("الرابط غير صالح أو منتهي، اطلب رابطاً جديداً")}`);
  return NextResponse.redirect(`${origin}${safePath(searchParams.get("next"))}`);
}
