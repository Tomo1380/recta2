import { Outlet } from "react-router";
import { UserAuthProvider } from "~/lib/user-auth";

export default function UserLayout() {
  return (
    <UserAuthProvider>
      <Outlet />
    </UserAuthProvider>
  );
}
