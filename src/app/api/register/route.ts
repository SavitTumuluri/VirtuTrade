import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const exists = await client.query("SELECT 1 FROM users WHERE email = $1", [email]);
    if (exists.rowCount && exists.rowCount > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const username = email.split("@")[0];

    const insert = await client.query(
      "INSERT INTO users (email, password_hash, username) VALUES ($1, $2, $3) RETURNING id, email, username",
      [email, passwordHash, username]
    );

    return NextResponse.json({ ok: true, user: insert.rows[0] }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    client.release();
  }
}
