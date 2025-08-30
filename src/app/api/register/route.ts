import { NextResponse } from "next/server";

import * as bcrypt from "bcryptjs";

import { pool } from "@/lib/db";

export async function POST(req: Request) {
  const { email, password, username } = await req.json();

  const cleanEmail = typeof email === "string" ? email.trim() : "";
  const cleanUser  = typeof username === "string" ? username.trim() : "";

  if (!cleanEmail || !password || !cleanUser) {
    return NextResponse.json({ error: "Missing email, username, or password." }, { status: 400 });
  }

  // Optional: enforce simple username policy here too
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUser)) {
    return NextResponse.json(
      { error: "Username must be 3-30 chars; letters, numbers, and underscores only." },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    // Check email
    const emailExists = await client.query("SELECT 1 FROM users WHERE email = $1", [cleanEmail]);
    if (emailExists.rowCount && emailExists.rowCount > 0) {
      return NextResponse.json({ error: "Email already registered." }, { status: 409 });
    }

    // Check username
    const userExists = await client.query("SELECT 1 FROM users WHERE username = $1", [cleanUser]);
    if (userExists.rowCount && userExists.rowCount > 0) {
      return NextResponse.json({ error: "Username is taken." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const insert = await client.query(
      "INSERT INTO users (email, password_hash, username) VALUES ($1, $2, $3) RETURNING id, email, username",
      [cleanEmail, passwordHash, cleanUser]
    );

    return NextResponse.json({ ok: true, user: insert.rows[0] }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    client.release();
  }
}
