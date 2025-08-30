import { NextResponse } from "next/server";

import * as bcrypt from "bcryptjs";

import { pool } from "@/lib/db";
import { signSession, type SessionPayload } from "@/lib/jwt";

export async function POST(req: Request) {
  const { email, password, remember } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Missing email or password." }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT id, email, username, password_hash FROM users WHERE email = $1", [
      email,
    ]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const payload: SessionPayload = {
      sub: String(user.id),
      email: user.email,
      username: user.username,
    };

    const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
    const token = await signSession(payload, remember ? "30d" : "1d");

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, username: user.username },
    });

    res.cookies.set({
      name: "session",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  } finally {
    client.release();
  }
}
