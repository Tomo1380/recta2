import { redirect } from "react-router";

// Legacy URL → new tab-based URL
export function loader() {
  return redirect("/admin/ai-chat?tab=qa&id=new");
}

export default function AdminFineTuningQaNew() {
  return null;
}
