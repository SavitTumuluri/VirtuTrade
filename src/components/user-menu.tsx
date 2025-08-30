import ClientUserMenu from "./user-menu.client";
import { getAuthUser } from "@/lib/auth";

export default async function UserMenu() {
  const me = await getAuthUser();
  // If not logged in, hide the button entirely
  if (!me) return null;

  return (
    <ClientUserMenu
      username={me.username}
      email={me.email}
    />
  );
}
