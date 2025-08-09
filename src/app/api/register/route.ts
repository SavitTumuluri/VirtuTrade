import { NextResponse } from "next/server";
const pg = require("pg");
const express = require("express");
const app = express();
const bcrypt = require("bcryptjs")

const port = 3000;
const hostname = "localhost";
import { pool } from "@/lib/db";

const hash = bcrypt.hash;

app.use(express.static("public"));
app.use(express.json());


export async function POST(req: Request) {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
  }

  try {
    const client = await pool.connect();

    const existing = await client.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      client.release();
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hash(password, 10);

    await client.query(
      "INSERT INTO users (email, password_hash, username) VALUES ($1, $2, $3)",
      [email, passwordHash, email.split("@")[0]]
    );

    client.release();
    return NextResponse.json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Error during registration:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
