import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET - Fetch mood stats (bypasses RLS)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000001";
    const days = parseInt(searchParams.get("days") || "7");

    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("get_mood_stats", {
      p_user_id: userId,
      p_days: days,
    });

    if (error) {
      console.error("Error fetching mood stats:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data?.[0] || null });
  } catch (error) {
    console.error("Unexpected error in mood stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
