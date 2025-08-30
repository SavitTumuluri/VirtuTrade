"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

// Make a stable color from a string
function hashToIdx(s: string, mod: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}
const COLORS = [
  "bg-rose-500",
  "bg-pink-500",
  "bg-fuchsia-500",
  "bg-purple-500",
  "bg-violet-500",
  "bg-indigo-500",
  "bg-blue-500",
  "bg-sky-500",
  "bg-cyan-500",
  "bg-teal-500",
  "bg-emerald-500",
  "bg-green-500",
  "bg-lime-500",
  "bg-yellow-500",
  "bg-amber-500",
  "bg-orange-500",
  "bg-red-500",
  "bg-slate-500",
];

type Props = { username: string; email: string };

export default function ClientUserMenu({ username, email }: Props) {
  const router = useRouter();
  const name = username || email?.split("@")[0] || "User";
  const initials =
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "U";
  const color = COLORS[hashToIdx(name + email, COLORS.length)];

  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function logout() {
    try {
      const res = await fetch("/api/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout failed");
      router.push("/auth/v1/login");
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border shadow-sm hover:bg-gray-50"
        aria-label="Open user menu"
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold text-white ${color}`}>
          {initials}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border bg-white p-2 shadow-lg">
          <div className="flex items-center gap-3 rounded-xl p-3 hover:bg-gray-50">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold text-white ${color}`}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium">{name}</div>
              <div className="truncate text-xs text-gray-500">{email}</div>
            </div>
          </div>
          <div className="my-2 h-px bg-gray-100" />
          <button onClick={logout} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-gray-50">
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
