import { cookies } from "next/headers";

import { verifySession, type SessionPayload } from "@/lib/jwt";

export type AuthedUser = SessionPayload & { id: number };

export async function getAuthUser(): Promise<AuthedUser | null> {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;

  try {
    const payload = await verifySession<SessionPayload>(token);
    if (!payload?.sub) return null;
    return { ...payload, id: Number(payload.sub) };
  } catch {
    return null;
  }
}
