import { getAuthUser } from "@/lib/auth";

import ClientUserMenu from "./user-menu.client";

export default async function UserMenu() {
  const me = await getAuthUser();
  // If not logged in, hide the button entirely
  if (!me) return null;

  return <ClientUserMenu username={me.username} email={me.email} />;
}
