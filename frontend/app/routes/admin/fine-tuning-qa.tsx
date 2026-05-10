import { redirect } from "react-router";

// Legacy URL → new tab-based URL
export function loader() {
  return redirect("/admin/ai-chat?tab=qa");
}

export default function AdminFineTuningQa() {
  return null;
}
