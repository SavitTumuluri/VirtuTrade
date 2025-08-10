import { Pool } from "pg";

export const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
  ssl: {
    rejectUnauthorized: false, // AWS RDS often requires this in dev
  },
});

pool.connect()
  .then(() => {
    console.log(`Connected to database: ${process.env.PGDATABASE}`);
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });