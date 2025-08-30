import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user: { id: me.id, email: me.email, username: me.username } });
}