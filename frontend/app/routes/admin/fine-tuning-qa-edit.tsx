import { redirect, type LoaderFunctionArgs } from "react-router";

// Legacy URL → new tab-based URL
export function loader({ params }: LoaderFunctionArgs) {
  const id = params.id;
  const target = id ? `/admin/ai-chat?tab=qa&id=${id}` : "/admin/ai-chat?tab=qa";
  return redirect(target);
}

export default function AdminFineTuningQaEdit() {
  return null;
}
