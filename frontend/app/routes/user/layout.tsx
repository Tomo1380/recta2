import { Outlet } from "react-router";
import { UserAuthProvider } from "~/lib/user-auth";
import CompareReadyBar from "~/components/user/shared/CompareReadyBar";

export default function UserLayout() {
  return (
    <UserAuthProvider>
      <Outlet />
      {/* tray が 2 件揃った時に画面下にフローティング表示。比較ページ自体では非表示。 */}
      <CompareReadyBar />
    </UserAuthProvider>
  );
}
